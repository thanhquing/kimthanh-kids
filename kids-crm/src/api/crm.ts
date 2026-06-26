import { api } from "./http";

export type DashboardSummary = {
  students: number;
  classrooms: number;
  staff: number;
  attendanceToday: Record<string, number>;
  pendingMedicine: number;
  pendingLeave: number;
  outstandingInvoices: number;
  overdueInvoices?: number;
  outstandingAmount: number;
  revenueThisMonth: number;
  attendanceTrend30d?: { date: string; present: number }[];
  medicineThisMonth?: Record<string, number>;
  medicineTotalThisMonth?: number;
  revenueLast6Months?: { period: string; month: string; amount: number }[];
  recentAnnouncements?: {
    id: string;
    title: string;
    audience: string;
    classroomName?: string | null;
    publishedAt?: string | null;
  }[];
};

export const crm = {
  dashboard: () => api.get<DashboardSummary>("/dashboard/summary"),
};

