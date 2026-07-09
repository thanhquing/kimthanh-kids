import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from "@nestjs/common";
import { Prisma, Shift, TenantRole } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { assertSchoolAccess, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateAssignmentInput {
  staffId: string;
  classroomId?: string;
  schoolId?: string;
  weekday: number; // 1=Thứ 2 ... 7=CN
  shift: Shift;
  duty: string;
  note?: string;
}
export interface UpdateAssignmentInput {
  classroomId?: string | null;
  weekday?: number;
  shift?: Shift;
  duty?: string;
  note?: string;
}

@Injectable()
export class AssignmentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Admin/HT tạo phân công tuần cho 1 nhân sự (GV/y tá...). */
  async create(user: AuthUser, input: CreateAssignmentInput) {
    // Nhân sự phải là thành viên đang hoạt động của trường (không phải phụ huynh).
    const staff = await this.prisma.system.user.findFirst({
      where: {
        id: input.staffId,
        tenantId: user.tenantId!,
        type: "TENANT",
        isActive: true,
        deletedAt: null,
        memberships: { some: { deletedAt: null, role: { not: TenantRole.PARENT } } },
      },
      select: { id: true },
    });
    if (!staff)
      throw new NotFoundException({ code: "NO_STAFF", message: "Không tìm thấy nhân sự" });

    // schoolId: lấy từ lớp nếu có, ngược lại bắt buộc truyền.
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

    try {
      return await this.prisma.db.staffAssignment.create({
        data: {
          schoolId,
          staffId: input.staffId,
          classroomId: input.classroomId,
          weekday: input.weekday,
          shift: input.shift,
          duty: input.duty,
          note: input.note,
          createdById: user.id,
        } as never,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        throw new ConflictException({
          code: "ASSIGNMENT_EXISTS",
          message: "Nhân sự đã có phân công cho ca này trong ngày",
        });
      throw e;
    }
  }

  /** Lịch phân công của tôi (nhân sự đang đăng nhập) — app GV hiển thị. */
  async myschedule(user: AuthUser, opts: PaginationQuery = {}) {
    const pg = page(opts);
    const where = { staffId: user.id };
    const [items, total] = await Promise.all([
      this.prisma.db.staffAssignment.findMany({
        where,
        include: { classroom: { select: { id: true, name: true } } },
        orderBy: [{ weekday: "asc" }, { shift: "asc" }],
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.staffAssignment.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Admin/HT xem phân công (lọc theo nhân sự/lớp/thứ), school-scope. */
  async list(
    user: AuthUser,
    opts: { staffId?: string; classroomId?: string; weekday?: number } & PaginationQuery = {},
  ) {
    const pg = page(opts);
    const where = {
      ...schoolWhere(user),
      ...(opts.staffId ? { staffId: opts.staffId } : {}),
      ...(opts.classroomId ? { classroomId: opts.classroomId } : {}),
      ...(opts.weekday ? { weekday: opts.weekday } : {}),
    };
    const [items, total] = await Promise.all([
      this.prisma.db.staffAssignment.findMany({
        where,
        include: {
          staff: { select: { id: true, fullName: true } },
          classroom: { select: { id: true, name: true } },
        },
        orderBy: [{ weekday: "asc" }, { shift: "asc" }],
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.staffAssignment.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  private async getOwned(user: AuthUser, id: string) {
    const found = await this.prisma.db.staffAssignment.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!found)
      throw new NotFoundException({ code: "NO_ASSIGNMENT", message: "Không tìm thấy phân công" });
  }

  async update(user: AuthUser, id: string, input: UpdateAssignmentInput) {
    await this.getOwned(user, id);
    try {
      return await this.prisma.db.staffAssignment.update({ where: { id }, data: input });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        throw new ConflictException({
          code: "ASSIGNMENT_EXISTS",
          message: "Nhân sự đã có phân công cho ca này trong ngày",
        });
      throw e;
    }
  }

  async remove(user: AuthUser, id: string) {
    await this.getOwned(user, id);
    await this.prisma.db.staffAssignment.delete({ where: { id } });
    return { ok: true };
  }
}
