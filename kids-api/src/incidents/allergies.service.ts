import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
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
  listByStudent(user: AuthUser, studentId: string) {
    return this.prisma.db.allergy.findMany({
      where: { studentId, ...recordScopeWhere(user) },
      orderBy: { createdAt: "asc" },
    });
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
