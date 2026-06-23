import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { MealType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import {
  contentScopeForKids,
  isStaff,
  ownedStudentWhere,
  schoolWhere,
} from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface MealInput {
  weekday: number;
  mealType: MealType;
  name: string;
  ingredients?: string;
}
export interface CreateMenuInput {
  weekStart: string; // YYYY-MM-DD
  schoolId?: string;
  classroomId?: string;
  note?: string;
  meals: MealInput[];
}

@Injectable()
export class MenusService {
  constructor(private readonly prisma: PrismaService) {}

  async create(user: AuthUser, input: CreateMenuInput) {
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

    return this.prisma.db.weeklyMenu.create({
      data: {
        schoolId,
        classroomId: input.classroomId,
        weekStart: new Date(input.weekStart),
        note: input.note,
        createdById: user.id,
        meals: {
          create: input.meals.map((m) => ({
            tenantId: user.tenantId!,
            weekday: m.weekday,
            mealType: m.mealType,
            name: m.name,
            ingredients: m.ingredients,
          })),
        },
      } as never,
      include: { meals: { orderBy: [{ weekday: "asc" }, { mealType: "asc" }] } },
    });
  }

  /** Danh sách thực đơn — staff (school-scope) hoặc PH (trường/lớp của con). */
  async list(user: AuthUser, opts: { weekStart?: string; classroomId?: string } = {}) {
    const base = isStaff(user) ? { ...schoolWhere(user) } : await this.parentScope(user);
    return this.prisma.db.weeklyMenu.findMany({
      where: {
        ...base,
        ...(opts.weekStart ? { weekStart: new Date(opts.weekStart) } : {}),
        ...(opts.classroomId ? { classroomId: opts.classroomId } : {}),
      },
      include: { classroom: { select: { id: true, name: true } } },
      orderBy: { weekStart: "desc" },
    });
  }

  private async parentScope(user: AuthUser) {
    const kids = await this.prisma.db.student.findMany({
      where: { parents: { some: { parentId: user.id } } },
      select: { schoolId: true, classroomId: true },
    });
    return contentScopeForKids(kids);
  }

  async get(user: AuthUser, id: string) {
    const base = isStaff(user) ? { ...schoolWhere(user) } : await this.parentScope(user);
    const menu = await this.prisma.db.weeklyMenu.findFirst({
      where: { id, ...base },
      include: {
        classroom: { select: { id: true, name: true } },
        meals: { orderBy: [{ weekday: "asc" }, { mealType: "asc" }] },
      },
    });
    if (!menu) throw new NotFoundException({ code: "NO_MENU", message: "Không tìm thấy thực đơn" });
    return menu;
  }

  async remove(user: AuthUser, id: string) {
    const menu = await this.prisma.db.weeklyMenu.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!menu) throw new NotFoundException({ code: "NO_MENU", message: "Không tìm thấy thực đơn" });
    await this.prisma.db.weeklyMenu.delete({ where: { id } });
    return { ok: true };
  }

  /** Cảnh báo dị ứng: đối chiếu dị ứng của học sinh với tên/nguyên liệu từng bữa. */
  async allergyWarnings(user: AuthUser, menuId: string, studentId: string) {
    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, studentId),
      select: { id: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    const base = isStaff(user) ? { ...schoolWhere(user) } : await this.parentScope(user);
    const menu = await this.prisma.db.weeklyMenu.findFirst({
      where: { id: menuId, ...base },
      include: { meals: true },
    });
    if (!menu) throw new NotFoundException({ code: "NO_MENU", message: "Không tìm thấy thực đơn" });

    const allergies = await this.prisma.db.allergy.findMany({
      where: { studentId },
      select: { allergen: true },
    });
    const terms = allergies.map((a) => a.allergen.toLowerCase()).filter(Boolean);

    const warnings = menu.meals
      .map((m) => {
        const text = `${m.name} ${m.ingredients ?? ""}`.toLowerCase();
        const matched = terms.filter((t) => text.includes(t));
        return matched.length
          ? { mealId: m.id, weekday: m.weekday, mealType: m.mealType, name: m.name, matched }
          : null;
      })
      .filter((w): w is NonNullable<typeof w> => w !== null);
    return { menuId, studentId, warnings };
  }
}
