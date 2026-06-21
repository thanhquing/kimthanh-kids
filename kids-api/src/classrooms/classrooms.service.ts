import { Injectable, NotFoundException } from "@nestjs/common";
import { LimitMetric } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { assertSchoolAccess, schoolWhere } from "../common/scope/school-scope";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateClassroomInput {
  schoolId: string;
  name: string;
  ageGroup?: string;
  capacity?: number;
  homeroomTeacherId?: string;
}
export interface UpdateClassroomInput {
  name?: string;
  ageGroup?: string;
  capacity?: number;
  homeroomTeacherId?: string | null;
  isActive?: boolean;
}

@Injectable()
export class ClassroomsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  list(user: AuthUser, schoolId?: string) {
    return this.prisma.db.classroom.findMany({
      where: { ...schoolWhere(user), ...(schoolId ? { schoolId } : {}) },
      orderBy: { name: "asc" },
      include: {
        homeroomTeacher: { select: { id: true, fullName: true } },
        _count: { select: { students: true } },
      },
    });
  }

  async get(user: AuthUser, id: string) {
    const classroom = await this.prisma.db.classroom.findFirst({
      where: { id, ...schoolWhere(user) },
      include: {
        homeroomTeacher: { select: { id: true, fullName: true } },
        _count: { select: { students: true } },
      },
    });
    if (!classroom)
      throw new NotFoundException({ code: "NO_CLASSROOM", message: "Không tìm thấy lớp" });
    return classroom;
  }

  async create(user: AuthUser, input: CreateClassroomInput) {
    assertSchoolAccess(user, input.schoolId);
    await this.entitlements.consumeQuota(user.tenantId!, LimitMetric.CLASSROOMS);
    try {
      // tenantId tự được extension gán theo ngữ cảnh.
      return await this.prisma.db.classroom.create({
        data: {
          schoolId: input.schoolId,
          name: input.name,
          ageGroup: input.ageGroup,
          capacity: input.capacity ?? 25,
          homeroomTeacherId: input.homeroomTeacherId,
          createdById: user.id,
        } as never,
      });
    } catch (e) {
      await this.entitlements.releaseQuota(user.tenantId!, LimitMetric.CLASSROOMS);
      throw e;
    }
  }

  async update(user: AuthUser, id: string, input: UpdateClassroomInput) {
    await this.get(user, id); // đảm bảo tồn tại + thuộc school được phép
    return this.prisma.db.classroom.update({ where: { id }, data: input });
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.db.classroom.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.entitlements.releaseQuota(user.tenantId!, LimitMetric.CLASSROOMS);
    return { ok: true };
  }
}
