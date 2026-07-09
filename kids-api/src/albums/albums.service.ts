import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import {
  assertSchoolAccess,
  contentScopeForKids,
  isStaff,
  schoolWhere,
} from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateAlbumInput {
  classroomId?: string;
  schoolId?: string;
  title: string;
  description?: string;
}
export interface AddPhotoInput {
  mediaId: string;
  caption?: string;
}

const photoInclude = {
  photos: {
    orderBy: { sortOrder: "asc" as const },
    include: {
      media: { select: { id: true, path: true, mimeType: true, width: true, height: true } },
    },
  },
};

@Injectable()
export class AlbumsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, input: CreateAlbumInput) {
    let schoolId = input.schoolId;
    if (input.classroomId) {
      const cls = await this.prisma.db.classroom.findFirst({
        where: { id: input.classroomId, ...schoolWhere(user) },
        select: { schoolId: true },
      });
      if (!cls)
        throw new NotFoundException({ code: "NO_CLASSROOM", message: "Không tìm thấy lớp" });
      schoolId = cls.schoolId;
    }
    if (!schoolId)
      throw new BadRequestException({
        code: "NO_SCHOOL",
        message: "Cần chỉ định cơ sở (schoolId)",
      });
    assertSchoolAccess(user, schoolId);

    return this.prisma.db.album.create({
      data: {
        schoolId,
        classroomId: input.classroomId,
        title: input.title,
        description: input.description,
        createdById: user.id,
      } as never,
    });
  }

  /** Gắn ảnh (đã upload qua /media) vào album. */
  async addPhotos(user: AuthUser, albumId: string, photos: AddPhotoInput[]) {
    const album = await this.prisma.db.album.findFirst({
      where: { id: albumId, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!album) throw new NotFoundException({ code: "NO_ALBUM", message: "Không tìm thấy album" });
    if (!photos.length)
      throw new BadRequestException({ code: "NO_PHOTOS", message: "Cần ít nhất 1 ảnh" });

    // Xác thực media thuộc tenant.
    const ids = photos.map((p) => p.mediaId);
    const found = await this.prisma.db.media.findMany({
      where: { id: { in: ids } },
      select: { id: true },
    });
    if (found.length !== new Set(ids).size)
      throw new BadRequestException({ code: "BAD_MEDIA", message: "Có ảnh không hợp lệ" });

    // Tiếp nối sortOrder hiện có để các lần gắn thêm không đè/đụng thứ tự ảnh cũ.
    const agg = await this.prisma.db.albumPhoto.aggregate({
      where: { albumId },
      _max: { sortOrder: true },
    });
    const offset = (agg._max.sortOrder ?? -1) + 1;

    await this.prisma.db.albumPhoto.createMany({
      data: photos.map((p, i) => ({
        tenantId: user.tenantId!,
        albumId,
        mediaId: p.mediaId,
        caption: p.caption,
        sortOrder: offset + i,
      })) as never,
    });
    return this.get(user, albumId);
  }

  private async parentScope(user: AuthUser) {
    const kids = await this.prisma.db.student.findMany({
      where: { parents: { some: { parentId: user.id } } },
      select: { schoolId: true, classroomId: true },
    });
    return contentScopeForKids(kids);
  }

  async list(user: AuthUser, opts: PaginationQuery & { classroomId?: string } = {}) {
    const pg = page(opts);
    const base = isStaff(user) ? { ...schoolWhere(user) } : await this.parentScope(user);
    const where = { ...base, ...(opts.classroomId ? { classroomId: opts.classroomId } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.db.album.findMany({
        where,
        include: {
          classroom: { select: { id: true, name: true } },
          _count: { select: { photos: true } },
        },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.album.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  async get(user: AuthUser, id: string) {
    const base = isStaff(user) ? { ...schoolWhere(user) } : await this.parentScope(user);
    const album = await this.prisma.db.album.findFirst({
      where: { id, ...base },
      include: { classroom: { select: { id: true, name: true } }, ...photoInclude },
    });
    if (!album) throw new NotFoundException({ code: "NO_ALBUM", message: "Không tìm thấy album" });
    return album;
  }

  async removePhoto(user: AuthUser, photoId: string) {
    const photo = await this.prisma.db.albumPhoto.findFirst({
      where: { id: photoId, album: { is: schoolWhere(user) } },
      select: { id: true },
    });
    if (!photo) throw new NotFoundException({ code: "NO_PHOTO", message: "Không tìm thấy ảnh" });
    await this.prisma.db.albumPhoto.delete({ where: { id: photoId } });
    return { ok: true };
  }

  async remove(user: AuthUser, id: string) {
    const album = await this.prisma.db.album.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!album) throw new NotFoundException({ code: "NO_ALBUM", message: "Không tìm thấy album" });
    await this.prisma.db.album.delete({ where: { id } });
    return { ok: true };
  }
}
