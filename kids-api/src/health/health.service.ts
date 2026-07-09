import { Injectable, NotFoundException } from "@nestjs/common";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { ownedStudentWhere, recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateHealthRecordInput {
  studentId: string;
  date: string; // YYYY-MM-DD
  heightCm?: number;
  weightKg?: number;
  temperatureC?: number;
  note?: string;
}

@Injectable()
export class HealthService {
  constructor(private readonly prisma: PrismaService) {}

  /** Y tá/staff ghi chỉ số sức khỏe cho 1 học sinh. */
  async create(user: AuthUser, input: CreateHealthRecordInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    return this.prisma.db.healthRecord.create({
      data: {
        schoolId: student.schoolId,
        studentId: input.studentId,
        date: new Date(input.date),
        heightCm: input.heightCm,
        weightKg: input.weightKg,
        temperatureC: input.temperatureC,
        note: input.note,
        recordedById: user.id,
      } as never, // tenantId auto-gán bởi extension
    });
  }

  /** Lịch sử chỉ số của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  async studentRecords(user: AuthUser, studentId: string, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = { studentId, ...recordScopeWhere(user) };
    const [items, total] = await Promise.all([
      this.prisma.db.healthRecord.findMany({
        where,
        orderBy: { date: "desc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.healthRecord.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Dữ liệu biểu đồ tăng trưởng (chiều cao/cân nặng theo thời gian, tăng dần). */
  async growth(user: AuthUser, studentId: string) {
    // chỉ trả về khi user có quyền xem học sinh
    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, studentId),
      select: { id: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    const rows = await this.prisma.db.healthRecord.findMany({
      where: { studentId, OR: [{ heightCm: { not: null } }, { weightKg: { not: null } }] },
      orderBy: { date: "asc" },
      select: { date: true, heightCm: true, weightKg: true },
    });
    return {
      height: rows
        .filter((r) => r.heightCm !== null)
        .map((r) => ({ date: r.date, value: r.heightCm })),
      weight: rows
        .filter((r) => r.weightKg !== null)
        .map((r) => ({ date: r.date, value: r.weightKg })),
    };
  }
}
