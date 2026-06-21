import { Injectable, NotFoundException } from "@nestjs/common";
import { Mood } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { isStaff, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

export interface UpsertReportInput {
  studentId: string;
  date: string; // YYYY-MM-DD
  mood?: Mood;
  meals?: string;
  nap?: string;
  activities?: string;
  note?: string;
}

@Injectable()
export class DailyReportsService {
  constructor(private readonly prisma: PrismaService) {}

  /** GV soạn/cập nhật báo cáo 1 học sinh trong 1 ngày (upsert theo studentId+date). */
  async upsert(user: AuthUser, input: UpsertReportInput) {
    const student = await this.prisma.db.student.findFirst({
      where: { id: input.studentId, ...schoolWhere(user) },
      select: { id: true, schoolId: true, classroomId: true },
    });
    if (!student)
      throw new NotFoundException({ code: "NO_STUDENT", message: "Không tìm thấy học sinh" });

    const date = new Date(input.date);
    const fields = {
      mood: input.mood,
      meals: input.meals,
      nap: input.nap,
      activities: input.activities,
      note: input.note,
      authorId: user.id,
    };
    return this.prisma.db.dailyReport.upsert({
      // upsert KHÔNG được extension auto-gán tenantId → set tường minh ở create.
      where: { studentId_date: { studentId: input.studentId, date } },
      create: {
        tenantId: user.tenantId!,
        schoolId: student.schoolId,
        studentId: input.studentId,
        classroomId: student.classroomId,
        date,
        ...fields,
      },
      update: fields,
    });
  }

  /** Báo cáo của 1 lớp trong 1 ngày. */
  listByClass(user: AuthUser, classroomId: string, date: string) {
    return this.prisma.db.dailyReport.findMany({
      where: { classroomId, date: new Date(date), ...schoolWhere(user) },
      include: { student: { select: { id: true, fullName: true } } },
      orderBy: { student: { fullName: "asc" } },
    });
  }

  /** Timeline báo cáo của 1 học sinh — staff (school-scope) hoặc phụ huynh (con mình). */
  studentFeed(user: AuthUser, studentId: string) {
    const access = isStaff(user)
      ? schoolWhere(user)
      : { student: { parents: { some: { parentId: user.id } } } };
    return this.prisma.db.dailyReport.findMany({
      where: { studentId, ...access },
      orderBy: { date: "desc" },
      take: 60,
    });
  }
}
