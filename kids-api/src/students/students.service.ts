import { Injectable, NotFoundException } from "@nestjs/common";
import { Gender, LimitMetric, StudentStatus } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { assertSchoolAccess, schoolWhere } from "../common/scope/school-scope";
import { EntitlementService } from "../entitlement/entitlement.service";
import { PrismaService } from "../prisma/prisma.service";

export interface GuardianInput {
  parentId: string;
  relationship: string;
  isPrimary?: boolean;
}
export interface CreateStudentInput {
  schoolId: string;
  classroomId?: string;
  fullName: string;
  nickname?: string;
  dateOfBirth: string; // YYYY-MM-DD
  gender: Gender;
  avatarUrl?: string;
  guardians?: GuardianInput[];
}
export interface UpdateStudentInput {
  classroomId?: string | null;
  fullName?: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: Gender;
  avatarUrl?: string;
  status?: StudentStatus;
}

const studentInclude = {
  classroom: { select: { id: true, name: true } },
  parents: {
    include: { parent: { select: { id: true, fullName: true, phone: true, email: true } } },
  },
};

@Injectable()
export class StudentsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly entitlements: EntitlementService,
  ) {}

  list(user: AuthUser, opts: { classroomId?: string; schoolId?: string } = {}) {
    return this.prisma.db.student.findMany({
      where: {
        ...schoolWhere(user),
        ...(opts.schoolId ? { schoolId: opts.schoolId } : {}),
        ...(opts.classroomId ? { classroomId: opts.classroomId } : {}),
      },
      orderBy: { fullName: "asc" },
      include: { classroom: { select: { id: true, name: true } } },
    });
  }

  async get(user: AuthUser, id: string) {
    const student = await this.prisma.db.student.findFirst({
      where: { id, ...schoolWhere(user) },
      include: studentInclude,
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });
    return student;
  }

  async create(user: AuthUser, input: CreateStudentInput) {
    assertSchoolAccess(user, input.schoolId);
    await this.entitlements.consumeQuota(user.tenantId!, LimitMetric.STUDENTS);
    try {
      return await this.prisma.db.student.create({
        data: {
          schoolId: input.schoolId,
          classroomId: input.classroomId,
          fullName: input.fullName,
          nickname: input.nickname,
          dateOfBirth: new Date(input.dateOfBirth),
          gender: input.gender,
          avatarUrl: input.avatarUrl,
          createdById: user.id,
          parents: input.guardians?.length
            ? {
                create: input.guardians.map((g) => ({
                  tenantId: user.tenantId!, // nested create KHÔNG được extension auto-gán
                  parentId: g.parentId,
                  relationship: g.relationship,
                  isPrimary: g.isPrimary ?? false,
                })),
              }
            : undefined,
        } as never,
        include: studentInclude,
      });
    } catch (e) {
      await this.entitlements.releaseQuota(user.tenantId!, LimitMetric.STUDENTS);
      throw e;
    }
  }

  async update(user: AuthUser, id: string, input: UpdateStudentInput) {
    await this.get(user, id);
    return this.prisma.db.student.update({
      where: { id },
      data: {
        ...input,
        dateOfBirth: input.dateOfBirth ? new Date(input.dateOfBirth) : undefined,
      },
      include: studentInclude,
    });
  }

  async remove(user: AuthUser, id: string) {
    await this.get(user, id);
    await this.prisma.db.student.update({ where: { id }, data: { deletedAt: new Date() } });
    await this.entitlements.releaseQuota(user.tenantId!, LimitMetric.STUDENTS);
    return { ok: true };
  }

  async addGuardian(user: AuthUser, studentId: string, input: GuardianInput) {
    await this.get(user, studentId);
    return this.prisma.db.studentParent.create({
      data: {
        studentId,
        parentId: input.parentId,
        relationship: input.relationship,
        isPrimary: input.isPrimary ?? false,
      } as never, // tenantId tự được extension gán (StudentParent ∈ TENANT_KEY)
    });
  }

  async removeGuardian(user: AuthUser, studentId: string, parentId: string) {
    await this.get(user, studentId);
    await this.prisma.db.studentParent.deleteMany({ where: { studentId, parentId } });
    return { ok: true };
  }

  /** Học sinh là con của phụ huynh đang đăng nhập. */
  myChildren(user: AuthUser) {
    return this.prisma.db.student.findMany({
      where: { parents: { some: { parentId: user.id } } },
      include: { classroom: { select: { id: true, name: true } } },
      orderBy: { fullName: "asc" },
    });
  }
}
