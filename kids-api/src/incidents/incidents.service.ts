import { Injectable, NotFoundException } from "@nestjs/common";
import { IncidentSeverity, NotificationType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateIncidentInput {
  studentId: string;
  date: string; // YYYY-MM-DD
  type: string;
  severity?: IncidentSeverity;
  description: string;
  actionTaken?: string;
}

@Injectable()
export class IncidentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** Staff ghi nhận sự cố cho 1 học sinh → thông báo phụ huynh (in-app; push đẩy sau). */
  async create(user: AuthUser, input: CreateIncidentInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true, fullName: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    const incident = await this.prisma.db.incident.create({
      data: {
        schoolId: student.schoolId,
        studentId: input.studentId,
        date: new Date(input.date),
        type: input.type,
        severity: input.severity ?? IncidentSeverity.LOW,
        description: input.description,
        actionTaken: input.actionTaken,
        reportedById: user.id,
      } as never,
    });

    await this.notifications.notifyStudentParents(user.tenantId!, input.studentId, {
      type: NotificationType.INCIDENT,
      title: `Sự cố của bé ${student.fullName}`,
      body: input.description,
      linkType: "Incident",
      linkId: incident.id,
    });
    return incident;
  }

  /** Danh sách sự cố cho staff (school-scope, lọc theo học sinh nếu có). */
  async list(user: AuthUser, opts: PaginationQuery & { studentId?: string } = {}) {
    const pg = page(opts);
    const where = {
      ...schoolWhere(user),
      ...(opts.studentId ? { studentId: opts.studentId } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.db.incident.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { date: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.incident.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Sự cố của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  async studentFeed(user: AuthUser, studentId: string, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = { studentId, ...recordScopeWhere(user) };
    const [items, total] = await Promise.all([
      this.prisma.db.incident.findMany({
        where,
        orderBy: { date: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.incident.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }
}
