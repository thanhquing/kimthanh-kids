import { BadRequestException, Injectable, NotFoundException } from "@nestjs/common";
import { PickupAuthorizationStatus, PickupEventType, TenantRole, UserType } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { ownedStudentWhere, recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreatePickupAuthorizationInput {
  studentId: string;
  parentUserId?: string;
  guardianName: string;
  guardianPhone: string;
  relationship?: string;
  note?: string;
}

export interface CreatePickupLogInput {
  studentId?: string;
  authorizationId?: string;
  eventType: PickupEventType;
  guardianName?: string;
  guardianPhone?: string;
  note?: string;
  occurredAt?: string;
}

const authorizationInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
      classroomId: true,
      classroom: { select: { id: true, name: true } },
    },
  },
  parentUser: { select: { id: true, fullName: true, phone: true } },
};

const logInclude = {
  student: {
    select: {
      id: true,
      fullName: true,
      classroomId: true,
      classroom: { select: { id: true, name: true } },
    },
  },
  authorization: {
    select: { id: true, guardianName: true, guardianPhone: true, relationship: true },
  },
};

@Injectable()
export class PickupService {
  constructor(private readonly prisma: PrismaService) {}

  listAuthorizations(
    user: AuthUser,
    opts: { studentId?: string; status?: PickupAuthorizationStatus } = {},
  ) {
    return this.prisma.db.pickupAuthorization.findMany({
      where: {
        ...recordScopeWhere(user),
        ...(opts.studentId ? { studentId: opts.studentId } : {}),
        ...(opts.status ? { status: opts.status } : {}),
      },
      include: authorizationInclude,
      orderBy: { createdAt: "desc" },
    });
  }

  async createAuthorization(user: AuthUser, input: CreatePickupAuthorizationInput) {
    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, input.studentId),
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    if (input.parentUserId) {
      const parent = await this.prisma.system.user.findFirst({
        where: {
          id: input.parentUserId,
          tenantId: user.tenantId!,
          type: UserType.TENANT,
          memberships: { some: { role: TenantRole.PARENT, deletedAt: null } },
          deletedAt: null,
        },
        select: { id: true },
      });
      if (!parent)
        throw new BadRequestException({
          code: "NO_PARENT",
          message: "Không tìm thấy phụ huynh",
        });
    }

    return this.prisma.db.pickupAuthorization.create({
      data: {
        schoolId: student.schoolId,
        studentId: student.id,
        parentUserId: input.parentUserId,
        guardianName: input.guardianName,
        guardianPhone: input.guardianPhone,
        relationship: input.relationship,
        note: input.note,
        createdById: user.id,
      } as never,
      include: authorizationInclude,
    });
  }

  async revokeAuthorization(user: AuthUser, id: string) {
    const found = await this.prisma.db.pickupAuthorization.findFirst({
      where: { id, ...schoolWhere(user) },
      select: { id: true },
    });
    if (!found)
      throw new NotFoundException({
        code: "NO_PICKUP_AUTHORIZATION",
        message: "Không tìm thấy người đón",
      });
    return this.prisma.db.pickupAuthorization.update({
      where: { id },
      data: { status: PickupAuthorizationStatus.REVOKED, revokedAt: new Date() },
      include: authorizationInclude,
    });
  }

  listLogs(user: AuthUser, opts: { studentId?: string } = {}) {
    return this.prisma.db.pickupLog.findMany({
      where: {
        ...recordScopeWhere(user),
        ...(opts.studentId ? { studentId: opts.studentId } : {}),
      },
      include: logInclude,
      orderBy: { occurredAt: "desc" },
      take: 200,
    });
  }

  async createLog(user: AuthUser, input: CreatePickupLogInput) {
    let studentId = input.studentId;
    let schoolId: string | undefined;
    let guardianName = input.guardianName;
    let guardianPhone = input.guardianPhone;

    if (input.authorizationId) {
      const authorization = await this.prisma.db.pickupAuthorization.findFirst({
        where: {
          id: input.authorizationId,
          status: PickupAuthorizationStatus.ACTIVE,
          ...schoolWhere(user),
        },
        select: {
          id: true,
          schoolId: true,
          studentId: true,
          guardianName: true,
          guardianPhone: true,
        },
      });
      if (!authorization)
        throw new NotFoundException({
          code: "NO_PICKUP_AUTHORIZATION",
          message: "Không tìm thấy người đón hợp lệ",
        });
      studentId = authorization.studentId;
      schoolId = authorization.schoolId;
      guardianName = guardianName || authorization.guardianName;
      guardianPhone = guardianPhone || authorization.guardianPhone;
    }

    if (!studentId)
      throw new BadRequestException({ code: "NO_STUDENT", message: "Cần chọn học sinh" });

    const student = await this.prisma.db.student.findFirst({
      where: ownedStudentWhere(user, studentId),
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });
    schoolId = schoolId ?? student.schoolId;
    if (!guardianName)
      throw new BadRequestException({
        code: "NO_GUARDIAN",
        message: "Cần tên người đưa/đón",
      });

    return this.prisma.db.pickupLog.create({
      data: {
        schoolId,
        studentId: student.id,
        authorizationId: input.authorizationId,
        eventType: input.eventType,
        guardianName,
        guardianPhone,
        note: input.note,
        occurredAt: input.occurredAt ? new Date(input.occurredAt) : new Date(),
        recordedById: user.id,
      } as never,
      include: logInclude,
    });
  }
}
