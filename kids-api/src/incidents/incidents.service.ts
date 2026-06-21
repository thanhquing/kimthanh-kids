import { Injectable, NotFoundException } from "@nestjs/common";
import { IncidentSeverity } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { recordScopeWhere, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface CreateIncidentInput {
  studentId: string;
  date: string; // YYYY-MM-DD
  type: string;
  severity?: IncidentSeverity;
  description: string;
  actionTaken?: string;
}

@Injectable()
export class IncidentsService {
  constructor(private readonly prisma: PrismaService) {}

  /** Staff ghi nhận sự cố cho 1 học sinh. (Notify PH — đẩy sau cùng push.) */
  async create(user: AuthUser, input: CreateIncidentInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    return this.prisma.db.incident.create({
      data: {
        schoolId: student.schoolId,
        studentId: input.studentId,
        date: new Date(input.date),
        type: input.type,
        severity: input.severity ?? IncidentSeverity.LOW,
        description: input.description,
        actionTaken: input.actionTaken,
        reportedById: user.id,
      } as never,
    });
  }

  /** Danh sách sự cố cho staff (school-scope, lọc theo học sinh nếu có). */
  list(user: AuthUser, opts: { studentId?: string } = {}) {
    return this.prisma.db.incident.findMany({
      where: { ...schoolWhere(user), ...(opts.studentId ? { studentId: opts.studentId } : {}) },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { date: "desc" },
      take: 200,
    });
  }

  /** Sự cố của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  studentFeed(user: AuthUser, studentId: string) {
    return this.prisma.db.incident.findMany({
      where: { studentId, ...recordScopeWhere(user) },
      orderBy: { date: "desc" },
      take: 100,
    });
  }
}
