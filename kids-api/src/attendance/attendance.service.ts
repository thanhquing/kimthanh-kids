import { Injectable, NotFoundException } from "@nestjs/common";
import { AttendanceStatus } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { isStaff, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface AttendanceEntry {
  studentId: string;
  status: AttendanceStatus;
  checkInAt?: string;
  note?: string;
}
export interface MarkBulkInput {
  classroomId: string;
  date: string; // YYYY-MM-DD
  entries: AttendanceEntry[];
}

@Injectable()
export class AttendanceService {
  constructor(private readonly prisma: PrismaService) {}

  /** GV điểm danh hàng loạt cho 1 lớp trong 1 ngày (upsert theo studentId+date). */
  async markBulk(user: AuthUser, input: MarkBulkInput) {
    const classroom = await this.prisma.db.classroom.findFirst({
      where: { id: input.classroomId, ...schoolWhere(user) },
    });
    if (!classroom)
      throw new NotFoundException({ code: "NO_CLASSROOM", message: "Không tìm thấy lớp" });

    const date = new Date(input.date);
    const students = await this.prisma.db.student.findMany({
      where: { classroomId: input.classroomId },
      select: { id: true },
    });
    const valid = new Set(students.map((s) => s.id));

    const ops = input.entries
      .filter((e) => valid.has(e.studentId))
      .map((e) =>
        this.prisma.db.attendance.upsert({
          // upsert KHÔNG được extension auto-gán tenantId → set tường minh ở create.
          where: { studentId_date: { studentId: e.studentId, date } },
          create: {
            tenantId: user.tenantId!,
            schoolId: classroom.schoolId,
            studentId: e.studentId,
            classroomId: input.classroomId,
            date,
            status: e.status,
            checkInAt: e.checkInAt ? new Date(e.checkInAt) : null,
            note: e.note,
            recordedById: user.id,
          },
          update: {
            status: e.status,
            checkInAt: e.checkInAt ? new Date(e.checkInAt) : null,
            note: e.note,
            recordedById: user.id,
            classroomId: input.classroomId,
          },
        }),
      );
    await this.prisma.db.$transaction(ops);
    return { marked: ops.length, skipped: input.entries.length - ops.length };
  }

  /** Bảng điểm danh của 1 lớp trong 1 ngày. */
  async listByClass(user: AuthUser, classroomId: string, date: string) {
    return this.prisma.db.attendance.findMany({
      where: { classroomId, date: new Date(date), ...schoolWhere(user) },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { student: { fullName: "asc" } },
    });
  }

  /** Lịch sử điểm danh của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  async studentHistory(user: AuthUser, studentId: string) {
    const access = isStaff(user)
      ? schoolWhere(user)
      : { student: { parents: { some: { parentId: user.id } } } };
    return this.prisma.db.attendance.findMany({
      where: { studentId, ...access },
      orderBy: { date: "desc" },
      take: 90,
    });
  }
}
