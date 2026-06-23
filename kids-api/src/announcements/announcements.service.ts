import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { AnnouncementAudience } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { assertSchoolAccess, isStaff, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateAnnouncementInput {
  audience: AnnouncementAudience;
  schoolId?: string;
  classroomId?: string;
  title: string;
  body: string;
  publish?: boolean; // mặc định true (đăng ngay)
}

@Injectable()
export class AnnouncementsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin/HT/GV soạn thông báo theo phạm vi (audience). CLASS → cần classroomId. */
  async create(user: AuthUser, input: CreateAnnouncementInput) {
    let schoolId = input.schoolId;
    if (input.audience === AnnouncementAudience.CLASS) {
      if (!input.classroomId)
        throw new BadRequestException({ code: "NO_CLASSROOM", message: "Cần chọn lớp" });
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

    return this.prisma.db.announcement.create({
      data: {
        schoolId,
        audience: input.audience,
        classroomId: input.audience === AnnouncementAudience.CLASS ? input.classroomId : null,
        title: input.title,
        body: input.body,
        publishedAt: input.publish === false ? null : new Date(),
        authorId: user.id,
      } as never,
    });
  }

  /** Danh sách cho staff (school-scope, gồm cả nháp). */
  list(user: AuthUser, opts: { audience?: AnnouncementAudience } = {}) {
    return this.prisma.db.announcement.findMany({
      where: { ...schoolWhere(user), ...(opts.audience ? { audience: opts.audience } : {}) },
      include: { classroom: { select: { id: true, name: true } } },
      orderBy: { createdAt: "desc" },
    });
  }

  /** WHERE hiển thị cho phụ huynh: đã đăng + (toàn trường/PH của trường con) hoặc (lớp của con). */
  private async parentVisibilityWhere(user: AuthUser) {
    const kids = await this.prisma.db.student.findMany({
      where: { parents: { some: { parentId: user.id } } },
      select: { schoolId: true, classroomId: true },
    });
    const schoolIds = [...new Set(kids.map((k) => k.schoolId))];
    const classroomIds = kids.map((k) => k.classroomId).filter((c): c is string => !!c);
    return {
      publishedAt: { not: null },
      OR: [
        {
          audience: { in: [AnnouncementAudience.ALL, AnnouncementAudience.PARENTS] },
          schoolId: { in: schoolIds },
        },
        { audience: AnnouncementAudience.CLASS, classroomId: { in: classroomIds } },
      ],
    };
  }

  /** Feed đã đăng — staff thấy mọi thông báo trong cơ sở; PH lọc theo con. */
  async feed(user: AuthUser) {
    const where = isStaff(user)
      ? { publishedAt: { not: null }, ...schoolWhere(user) }
      : await this.parentVisibilityWhere(user);
    return this.prisma.db.announcement.findMany({
      where,
      include: { classroom: { select: { id: true, name: true } } },
      orderBy: { publishedAt: "desc" },
      take: 100,
    });
  }

  async get(user: AuthUser, id: string) {
    const where = isStaff(user)
      ? { id, ...schoolWhere(user) }
      : { id, ...(await this.parentVisibilityWhere(user)) };
    const a = await this.prisma.db.announcement.findFirst({
      where,
      include: { classroom: { select: { id: true, name: true } } },
    });
    if (!a) throw new NotFoundException({ code: "NO_ANNOUNCEMENT", message: "Không tìm thấy" });
    return a;
  }

  async publish(user: AuthUser, id: string) {
    await this.get(user, id);
    return this.prisma.db.announcement.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.db.announcement.delete({ where: { id } });
    return { ok: true };
  }
}
