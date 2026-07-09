import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { LeaveStatus, LeaveType, NotificationType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { ownedStudentWhere, recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateLeaveInput {
  studentId: string;
  leaveType: LeaveType;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason?: string;
  attachmentUrl?: string;
}

@Injectable()
export class LeaveService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** PH (hoặc staff) tạo đơn xin nghỉ cho con/học sinh. */
  async create(user: AuthUser, input: CreateLeaveInput) {
    if (new Date(input.endDate) < new Date(input.startDate))
      throw new BadRequestException({
        code: "BAD_RANGE",
        message: "Ngày kết thúc trước ngày bắt đầu",
      });

    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, input.studentId),
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    return this.prisma.db.leaveRequest.create({
      data: {
        schoolId: student.schoolId,
        studentId: input.studentId,
        leaveType: input.leaveType,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason,
        attachmentUrl: input.attachmentUrl,
        requestedById: user.id,
      } as never,
    });
  }

  /** Đơn của các con phụ huynh đang đăng nhập. */
  async listMine(user: AuthUser, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = { student: { parents: { some: { parentId: user.id } } } };
    const [items, total] = await Promise.all([
      this.prisma.db.leaveRequest.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.leaveRequest.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Danh sách cho staff (lọc theo trạng thái); mặc định PENDING để duyệt. */
  async listForStaff(user: AuthUser, opts: PaginationQuery & { status?: LeaveStatus } = {}) {
    const pg = page(opts);
    const where = { ...schoolWhere(user), ...(opts.status ? { status: opts.status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.db.leaveRequest.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.leaveRequest.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Chi tiết — staff (school-scope) hoặc phụ huynh sở hữu. */
  async get(user: AuthUser, id: string) {
    const req = await this.prisma.db.leaveRequest.findFirst({
      where: { id, ...recordScopeWhere(user) },
      include: { student: { select: { id: true, fullName: true } } },
    });
    if (!req) throw new NotFoundException({ code: "NO_LEAVE", message: "Không tìm thấy đơn" });
    return req;
  }

  /** GV/admin duyệt hoặc từ chối đơn (chỉ khi còn PENDING). */
  async decide(user: AuthUser, id: string, status: LeaveStatus, note?: string) {
    if (status !== LeaveStatus.APPROVED && status !== LeaveStatus.REJECTED)
      throw new BadRequestException({ code: "BAD_STATUS", message: "Trạng thái không hợp lệ" });

    const req = await this.prisma.db.leaveRequest.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true, status: true, requestedById: true },
    });
    if (!req) throw new NotFoundException({ code: "NO_LEAVE", message: "Không tìm thấy đơn" });
    if (req.status !== LeaveStatus.PENDING)
      throw new BadRequestException({ code: "ALREADY_DECIDED", message: "Đơn đã được xử lý" });

    const updated = await this.prisma.db.leaveRequest.update({
      where: { id },
      data: { status, handledById: user.id, handledAt: new Date(), decisionNote: note },
    });

    if (req.requestedById) {
      await this.notifications.notify(user.tenantId!, [req.requestedById], {
        type: NotificationType.LEAVE,
        title:
          status === LeaveStatus.APPROVED ? "Đơn xin nghỉ được duyệt" : "Đơn xin nghỉ bị từ chối",
        body: note,
        linkType: "LeaveRequest",
        linkId: id,
      });
    }
    return updated;
  }
}
