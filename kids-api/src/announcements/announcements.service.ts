import { BadRequestException, Injectable, Logger, NotFoundException } from "@nestjs/common";
import { AnnouncementAudience, NotificationType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import {
  STAFF_ROLE_LIST,
  assertSchoolAccess,
  isStaff,
  schoolWhere,
} from "../common/scope/school-scope";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

interface NotifiableAnnouncement {
  id: string;
  audience: AnnouncementAudience;
  schoolId: string;
  classroomId: string | null;
  title: string;
}

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
  private readonly logger = new Logger(AnnouncementsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Người nhận thông báo theo audience: PH (toàn trường/PH/lớp) và/hoặc nhân sự (TEACHERS/ALL). */
  private async resolveRecipients(a: NotifiableAnnouncement): Promise<string[]> {
    const ids: string[] = [];

    const wantsParents =
      a.audience === AnnouncementAudience.ALL ||
      a.audience === AnnouncementAudience.PARENTS ||
      a.audience === AnnouncementAudience.CLASS;
    if (wantsParents) {
      const studentWhere =
        a.audience === AnnouncementAudience.CLASS
          ? { classroomId: a.classroomId }
          : { schoolId: a.schoolId };
      const links = await this.prisma.db.studentParent.findMany({
        where: { student: studentWhere },
        select: { parentId: true },
      });
      ids.push(...links.map((l) => l.parentId));
    }

    const wantsStaff =
      a.audience === AnnouncementAudience.ALL || a.audience === AnnouncementAudience.TEACHERS;
    if (wantsStaff) {
      const members = await this.prisma.db.membership.findMany({
        where: {
          role: { in: STAFF_ROLE_LIST },
          isActive: true,
          OR: [{ schoolId: null }, { schoolId: a.schoolId }],
        },
        select: { userId: true },
      });
      ids.push(...members.map((m) => m.userId));
    }
    return ids;
  }

  /**
   * Phát thông báo in-app khi 1 announcement chuyển sang trạng thái đã đăng.
   * Best-effort: việc giải resolveRecipients + notify không được làm hỏng create/publish.
   */
  private async notifyPublished(tenantId: string, a: NotifiableAnnouncement): Promise<void> {
    try {
      const recipients = await this.resolveRecipients(a);
      await this.notifications.notify(tenantId, recipients, {
        type: NotificationType.ANNOUNCEMENT,
        title: a.title,
        linkType: "Announcement",
        linkId: a.id,
      });
    } catch (e) {
      this.logger.error(`notifyPublished thất bại (announcement=${a.id})`, e as Error);
    }
  }

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

    const announcement = await this.prisma.db.announcement.create({
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

    if (announcement.publishedAt) await this.notifyPublished(user.tenantId!, announcement);
    return announcement;
  }

  /** Danh sách cho staff (school-scope, gồm cả nháp). */
  async list(user: AuthUser, opts: PaginationQuery & { audience?: AnnouncementAudience } = {}) {
    const pg = page(opts);
    const where = { ...schoolWhere(user), ...(opts.audience ? { audience: opts.audience } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.db.announcement.findMany({
        where,
        include: { classroom: { select: { id: true, name: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.announcement.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
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
  async feed(user: AuthUser, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = isStaff(user)
      ? { publishedAt: { not: null }, ...schoolWhere(user) }
      : await this.parentVisibilityWhere(user);
    const [items, total] = await Promise.all([
      this.prisma.db.announcement.findMany({
        where,
        include: { classroom: { select: { id: true, name: true } } },
        orderBy: { publishedAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.announcement.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
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
    const current = await this.get(user, id);
    const updated = await this.prisma.db.announcement.update({
      where: { id },
      data: { publishedAt: new Date() },
    });
    // Chỉ phát thông báo khi chuyển TỪ nháp sang đăng (tránh notify lại nếu publish trùng).
    if (!current.publishedAt) await this.notifyPublished(user.tenantId!, updated);
    return updated;
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.db.announcement.delete({ where: { id } });
    return { ok: true };
  }
}
