import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { MediaKind } from "@prisma/client";
import { randomUUID } from "node:crypto";
import { createReadStream } from "node:fs";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import sharp from "sharp";
import { AuditService } from "../audit/audit.service";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { assertSchoolAccess, isStaff } from "../common/scope/school-scope";
import { EnvService } from "../config/env.service";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";

export interface UploadFile {
  buffer: Buffer;
  mimetype: string;
  originalname: string;
}

@Injectable()
export class MediaService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly env: EnvService,
    private readonly entitlements: EntitlementService,
    private readonly audit: AuditService,
  ) {}

  /**
   * Nén ảnh (resize cạnh dài ≤ MEDIA_MAX_DIM, webp quality MEDIA_QUALITY, xoá metadata)
   * rồi lưu nội bộ dưới MEDIA_ROOT/<tenantId>/<id>.webp. Đủ chất lượng cho phụ huynh xem.
   */
  async uploadImage(
    user: AuthUser,
    file: UploadFile,
    opts: { kind?: MediaKind; schoolId?: string } = {},
  ) {
    if (!file?.buffer?.length)
      throw new BadRequestException({ code: "NO_FILE", message: "Thiếu file" });
    if (!file.mimetype.startsWith("image/")) {
      throw new BadRequestException({ code: "NOT_IMAGE", message: "Chỉ nhận file ảnh" });
    }

    // Gắn media vào 1 school → user phải có quyền trên school đó và school phải thuộc tenant.
    if (opts.schoolId) {
      assertSchoolAccess(user, opts.schoolId);
      const school = await this.prisma.db.school.findFirst({
        where: { id: opts.schoolId },
        select: { id: true },
      });
      if (!school)
        throw new NotFoundException({ code: "NO_SCHOOL", message: "Không tìm thấy cơ sở" });
    }

    const maxDim = this.env.get("MEDIA_MAX_DIM");
    const quality = this.env.get("MEDIA_QUALITY");
    let out;
    try {
      out = await sharp(file.buffer)
        .rotate() // tôn trọng EXIF orientation
        .resize({ width: maxDim, height: maxDim, fit: "inside", withoutEnlargement: true })
        .webp({ quality })
        .toBuffer({ resolveWithObject: true });
    } catch {
      throw new BadRequestException({ code: "BAD_IMAGE", message: "Ảnh không hợp lệ" });
    }
    const data = out.data;
    const sizeBytes = data.length;

    await this.assertStorageQuota(user.tenantId!, sizeBytes);

    const tenantId = user.tenantId!;
    const rel = `${tenantId}/${randomUUID()}.webp`;
    const abs = join(this.root(), rel);
    await mkdir(join(this.root(), tenantId), { recursive: true });
    await writeFile(abs, data);

    const media = await this.prisma.db.media.create({
      data: {
        kind: opts.kind ?? MediaKind.OTHER,
        schoolId: opts.schoolId,
        path: rel,
        mimeType: "image/webp",
        sizeBytes,
        width: out.info.width,
        height: out.info.height,
        originalName: file.originalname,
        uploadedById: user.id,
      } as never, // tenantId tự được extension gán
    });
    await this.audit.logAs(
      user,
      "media.upload",
      { type: "Media", id: media.id },
      { kind: media.kind },
    );
    return media;
  }

  /** Lấy thông tin + stream file, giới hạn theo tenant và quyền xem nội dung gắn với media. */
  async getReadable(user: AuthUser, id: string) {
    const media = await this.prisma.db.media.findFirst({
      where: await this.readableWhere(user, id),
    });
    if (!media) throw new NotFoundException({ code: "NO_MEDIA", message: "Không tìm thấy file" });
    const abs = join(this.root(), media.path);
    return { stream: createReadStream(abs), mimeType: media.mimeType };
  }

  private async readableWhere(user: AuthUser, id: string): Promise<object> {
    if (isStaff(user)) {
      if (user.allowedSchoolIds === null) return { id };
      const schoolId = { in: user.allowedSchoolIds };
      return {
        id,
        OR: [
          { uploadedById: user.id },
          { schoolId },
          { reportPhotos: { some: { report: { schoolId } } } },
          { albumPhotos: { some: { album: { schoolId } } } },
        ],
      };
    }

    const kids = await this.prisma.db.student.findMany({
      where: { parents: { some: { parentId: user.id } } },
      select: { schoolId: true, classroomId: true },
    });
    const schoolIds = [...new Set(kids.map((k) => k.schoolId))];
    const classroomIds = kids.map((k) => k.classroomId).filter((c): c is string => !!c);

    return {
      id,
      OR: [
        {
          reportPhotos: {
            some: { report: { student: { parents: { some: { parentId: user.id } } } } },
          },
        },
        {
          albumPhotos: {
            some: {
              album: {
                OR: [
                  { classroomId: null, schoolId: { in: schoolIds } },
                  { classroomId: { in: classroomIds } },
                ],
              },
            },
          },
        },
      ],
    };
  }

  private async assertStorageQuota(tenantId: string, addBytes: number) {
    const ent = await this.entitlements.resolve(tenantId);
    const limit = ent.limits.STORAGE_MB;
    if (!limit || limit.limitValue === null) return; // unlimited
    const agg = await this.prisma.db.media.aggregate({
      where: { tenantId },
      _sum: { sizeBytes: true },
    });
    const usedBytes = agg._sum.sizeBytes ?? 0;
    const limitBytes = limit.limitValue * 1024 * 1024;
    if (limit.enforcement === "HARD" && usedBytes + addBytes > limitBytes) {
      throw new ForbiddenException({
        code: "STORAGE_EXCEEDED",
        message: `Đã đạt giới hạn lưu trữ ${limit.limitValue}MB của gói`,
      });
    }
  }

  private root(): string {
    return this.env.get("MEDIA_ROOT");
  }
}
