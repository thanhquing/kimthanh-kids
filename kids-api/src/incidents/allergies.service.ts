import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { paginated } from "../common/http/api-response";
import { page, PaginationQuery } from "../common/http/pagination";
import { recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateAllergyInput {
  studentId: string;
  allergen: string;
  note?: string;
}

@Injectable()
export class AllergiesService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staff khai báo dị ứng cho học sinh (unique theo studentId+allergen). */
  async create(user: AuthUser, input: CreateAllergyInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    try {
      return await this.prisma.db.allergy.create({
        data: {
          schoolId: student.schoolId,
          studentId: input.studentId,
          allergen: input.allergen,
          note: input.note,
        } as never,
      });
    } catch (e) {
      if (e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002")
        throw new ConflictException({ code: "DUP_ALLERGY", message: "Dị ứng đã tồn tại" });
      throw e;
    }
  }

  /** Dị ứng của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  async listByStudent(user: AuthUser, studentId: string, query: PaginationQuery = {}) {
    const pg = page(query);
    const where = { studentId, ...recordScopeWhere(user) };
    const [items, total] = await Promise.all([
      this.prisma.db.allergy.findMany({
        where,
        orderBy: { createdAt: "asc" },
        skip: pg.skip,
        take: pg.take,
      }),
      this.prisma.db.allergy.count({ where }),
    ]);
    return paginated(items, { page: pg.page, pageSize: pg.pageSize, total });
  }

  /** Staff xoá khai báo dị ứng. */
  async remove(user: AuthUser, id: string) {
    const found = await this.prisma.db.allergy.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!found)
      throw new NotFoundException({ code: "NO_ALLERGY", message: "Không tìm thấy khai báo" });
    await this.prisma.db.allergy.delete({ where: { id } });
    return { ok: true };
  }
}
