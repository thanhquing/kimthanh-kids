import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MedicineStatus, NotificationType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { ownedStudentWhere, recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { NotificationsService } from "../notifications/notifications.service";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateMedicineInput {
  studentId: string;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string; // YYYY-MM-DD
  endDate: string;
  reason?: string;
}

// Trạng thái y tá được phép chuyển tới (từ PENDING/APPROVED).
const HANDLE_TARGETS: MedicineStatus[] = [
  MedicineStatus.APPROVED,
  MedicineStatus.REJECTED,
  MedicineStatus.ADMINISTERED,
];

@Injectable()
export class MedicineService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /** PH (hoặc staff) tạo yêu cầu cho con/học sinh; mở timeline với mốc PENDING. */
  async create(user: AuthUser, input: CreateMedicineInput) {
    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, input.studentId),
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    return this.prisma.db.medicineRequest.create({
      data: {
        schoolId: student.schoolId,
        studentId: input.studentId,
        medicineName: input.medicineName,
        dosage: input.dosage,
        schedule: input.schedule,
        startDate: new Date(input.startDate),
        endDate: new Date(input.endDate),
        reason: input.reason,
        requestedById: user.id,
        history: {
          create: {
            tenantId: user.tenantId!, // nested create KHÔNG được extension auto-gán
            status: MedicineStatus.PENDING,
            note: "Phụ huynh tạo yêu cầu",
            actorId: user.id,
          },
        },
      } as never,
    });
  }

  /** Yêu cầu của các con phụ huynh đang đăng nhập. */
  async listMine(user: AuthUser, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = { student: { parents: { some: { parentId: user.id } } } };
    const [items, total] = await Promise.all([
      this.prisma.db.medicineRequest.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.medicineRequest.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Danh sách cho staff (lọc theo trạng thái); mặc định PENDING để duyệt. */
  async listForStaff(user: AuthUser, opts: PaginationQuery & { status?: MedicineStatus } = {}) {
    const pg = page(opts);
    const where = { ...schoolWhere(user), ...(opts.status ? { status: opts.status } : {}) };
    const [items, total] = await Promise.all([
      this.prisma.db.medicineRequest.findMany({
        where,
        include: { student: { select: { id: true, fullName: true } } },
        orderBy: { createdAt: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.medicineRequest.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Chi tiết + timeline — staff (school-scope) hoặc phụ huynh sở hữu. */
  async get(user: AuthUser, id: string) {
    const req = await this.prisma.db.medicineRequest.findFirst({
      where: { id, ...recordScopeWhere(user) },
      include: {
        student: { select: { id: true, fullName: true } },
        history: { orderBy: { createdAt: "asc" } },
      },
    });
    if (!req)
      throw new NotFoundException({
        code: "NO_MEDICINE_REQUEST",
        message: "Không tìm thấy yêu cầu",
      });
    return req;
  }

  /** Y tá/staff duyệt / từ chối / đánh dấu đã cho uống — ghi thêm mốc timeline. */
  async handle(user: AuthUser, id: string, status: MedicineStatus, note?: string) {
    if (!HANDLE_TARGETS.includes(status))
      throw new BadRequestException({ code: "BAD_STATUS", message: "Trạng thái không hợp lệ" });

    const req = await this.prisma.db.medicineRequest.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true, status: true, requestedById: true, medicineName: true },
    });
    if (!req)
      throw new NotFoundException({
        code: "NO_MEDICINE_REQUEST",
        message: "Không tìm thấy yêu cầu",
      });
    if (req.status === MedicineStatus.REJECTED)
      throw new BadRequestException({ code: "ALREADY_REJECTED", message: "Yêu cầu đã bị từ chối" });
    // Chỉ cho ADMINISTERED khi đã APPROVED.
    if (status === MedicineStatus.ADMINISTERED && req.status !== MedicineStatus.APPROVED)
      throw new BadRequestException({
        code: "NOT_APPROVED",
        message: "Cần duyệt trước khi đánh dấu đã cho uống",
      });

    const [updated] = await this.prisma.db.$transaction([
      this.prisma.db.medicineRequest.update({
        where: { id },
        data: { status, handledById: user.id, handledAt: new Date() },
      }),
      this.prisma.db.medicineStatusHistory.create({
        data: { tenantId: user.tenantId!, requestId: id, status, note, actorId: user.id } as never,
      }),
    ]);

    if (req.requestedById) {
      const label: Record<string, string> = {
        APPROVED: "đã được duyệt",
        REJECTED: "bị từ chối",
        ADMINISTERED: "đã cho bé uống",
      };
      await this.notifications.notify(user.tenantId!, [req.requestedById], {
        type: NotificationType.MEDICINE,
        title: `Yêu cầu thuốc ${req.medicineName}: ${label[status] ?? status}`,
        body: note,
        linkType: "MedicineRequest",
        linkId: id,
      });
    }
    return updated;
  }
}
