import { Injectable } from "@nestjs/common";
import { AttendanceStatus, LeaveStatus, MedicineStatus, Prisma } from "@prisma/client";
import { AuthUser } from "../common/decorators/current-user.decorator";
import { STAFF_ROLE_LIST, schoolWhere } from "../common/scope/school-scope";
import { PrismaService } from "../prisma/prisma.service";

const OUTSTANDING_STATUS = ["UNPAID", "PARTIAL", "OVERDUE"] as const;
const DEFAULT_TZ = "Asia/Ho_Chi_Minh";

/**
 * Mốc [đầu ngày, cuối ngày) hôm nay theo timezone của trường, trả về dưới dạng UTC.
 * Attendance.date được lưu là UTC-midnight của chuỗi "YYYY-MM-DD" → phải tính bound
 * từ ngày-lịch ở đúng timezone rồi quy về UTC-midnight để so khớp (tránh lệch ngày).
 */
function todayBoundsInTz(now: Date, timeZone: string): { start: Date; end: Date } {
  const dateStr = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now); // "YYYY-MM-DD" theo lịch địa phương
  const start = new Date(`${dateStr}T00:00:00.000Z`);
  const end = new Date(start.getTime() + 24 * 3600 * 1000);
  return { start, end };
}

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  /** KPI tổng hợp cho admin/HT trong phạm vi cơ sở được phép. */
  async summary(user: AuthUser) {
    const scope = schoolWhere(user);
    const now = new Date();

    const settings = await this.prisma.system.tenantSettings.findUnique({
      where: { tenantId: user.tenantId! },
      select: { timezone: true },
    });
    const { start, end } = todayBoundsInTz(now, settings?.timezone || DEFAULT_TZ);
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

    // Nhân sự cũng theo school-scope (đồng nhất với student/classroom): admin toàn tenant
    // → đếm tất cả; admin giới hạn cơ sở → nhân sự của cơ sở đó + nhân sự toàn trường (schoolId null).
    const staffWhere: Prisma.MembershipWhereInput =
      user.allowedSchoolIds === null
        ? { role: { in: STAFF_ROLE_LIST }, isActive: true }
        : {
            role: { in: STAFF_ROLE_LIST },
            isActive: true,
            OR: [{ schoolId: null }, { schoolId: { in: user.allowedSchoolIds } }],
          };

    const [
      students,
      classrooms,
      staff,
      attendanceGroups,
      pendingMedicine,
      pendingLeave,
      outstandingInvoices,
      revenueAgg,
    ] = await Promise.all([
      this.prisma.db.student.count({ where: scope }),
      this.prisma.db.classroom.count({ where: scope }),
      this.prisma.db.membership.count({ where: staffWhere }),
      this.prisma.db.attendance.groupBy({
        by: ["status"],
        where: { ...scope, date: { gte: start, lt: end } },
        _count: { _all: true },
      }),
      this.prisma.db.medicineRequest.count({
        where: { ...scope, status: MedicineStatus.PENDING },
      }),
      this.prisma.db.leaveRequest.count({ where: { ...scope, status: LeaveStatus.PENDING } }),
      this.prisma.db.tuitionInvoice.findMany({
        where: { ...scope, status: { in: [...OUTSTANDING_STATUS] } },
        select: { total: true, amountPaid: true },
      }),
      this.prisma.db.tuitionPayment.aggregate({
        where: { ...scope, status: "SUCCEEDED", paidAt: { gte: monthStart } },
        _sum: { amount: true },
      }),
    ]);

    const attendanceToday = Object.fromEntries(
      Object.values(AttendanceStatus).map((s) => [s, 0]),
    ) as Record<AttendanceStatus, number>;
    for (const g of attendanceGroups) attendanceToday[g.status] = g._count._all;

    const outstandingAmount = outstandingInvoices.reduce(
      (sum, inv) => sum + (Number(inv.total) - Number(inv.amountPaid)),
      0,
    );

    return {
      students,
      classrooms,
      staff,
      attendanceToday,
      pendingMedicine,
      pendingLeave,
      outstandingInvoices: outstandingInvoices.length,
      outstandingAmount,
      revenueThisMonth: Number(revenueAgg._sum.amount ?? 0),
    };
  }
}
