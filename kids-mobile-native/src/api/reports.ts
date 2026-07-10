import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type Mood = "HAPPY" | "NEUTRAL" | "TIRED" | "FUSSY";

export type DailyReport = {
  id: string;
  schoolId: string;
  studentId: string;
  classroomId?: string | null;
  date: string;
  mood?: Mood | null;
  meals?: string | null;
  nap?: string | null;
  activities?: string | null;
  note?: string | null;
  student?: { id: string; fullName: string };
};

export type UpsertDailyReportInput = {
  studentId: string;
  date: string;
  mood?: Mood;
  meals?: string;
  nap?: string;
  activities?: string;
  note?: string;
  photoIds?: string[]; // media đã upload (kind REPORT_PHOTO) gắn vào báo cáo
};

export const reportKeys = {
  all: ["daily-reports"] as const,
  byClass: (classroomId?: string, date?: string) =>
    [...reportKeys.all, "class", classroomId, date] as const,
  byStudent: (studentId?: string) => [...reportKeys.all, "student", studentId] as const,
};

export function listReportsByClass(classroomId: string, date: string): Promise<DailyReport[]> {
  return api.get<DailyReport[]>("/daily-reports", { query: { classroomId, date } });
}

export function listReportsByStudent(studentId: string): Promise<DailyReport[]> {
  return api.get<DailyReport[]>(`/daily-reports/student/${studentId}`);
}

export function upsertDailyReport(input: UpsertDailyReportInput) {
  return api.post<DailyReport>("/daily-reports", input);
}

export function useReportsByClass(classroomId?: string, date?: string) {
  return useQuery({
    queryKey: reportKeys.byClass(classroomId, date),
    queryFn: () => listReportsByClass(classroomId!, date!),
    enabled: !!classroomId && !!date,
  });
}

export function useStudentReports(studentId?: string) {
  return useQuery({
    queryKey: reportKeys.byStudent(studentId),
    queryFn: () => listReportsByStudent(studentId!),
    enabled: !!studentId,
  });
}

export function useUpsertDailyReport() {
  return useMutation({
    mutationFn: upsertDailyReport,
  });
}

