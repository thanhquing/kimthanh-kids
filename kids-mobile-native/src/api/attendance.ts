import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";

export type Attendance = {
  id: string;
  schoolId: string;
  studentId: string;
  classroomId: string;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string | null;
  note?: string | null;
  student?: { id: string; fullName: string };
};

export type AttendanceEntryInput = {
  studentId: string;
  status: AttendanceStatus;
  checkInAt?: string;
  note?: string;
};

export type MarkAttendanceInput = {
  classroomId: string;
  date: string;
  entries: AttendanceEntryInput[];
};

export const attendanceKeys = {
  all: ["attendance"] as const,
  byClass: (classroomId?: string, date?: string) =>
    [...attendanceKeys.all, "class", classroomId, date] as const,
  byStudent: (studentId?: string) => [...attendanceKeys.all, "student", studentId] as const,
};

export function listAttendanceByClass(classroomId: string, date: string): Promise<Attendance[]> {
  return api.get<Attendance[]>("/attendance", { query: { classroomId, date } });
}

export function listAttendanceByStudent(studentId: string): Promise<Attendance[]> {
  return api.get<Attendance[]>(`/attendance/student/${studentId}`);
}

export function markAttendance(input: MarkAttendanceInput) {
  return api.post<{ marked: number; skipped: number }>("/attendance/mark", input);
}

export function useAttendanceByClass(classroomId?: string, date?: string) {
  return useQuery({
    queryKey: attendanceKeys.byClass(classroomId, date),
    queryFn: () => listAttendanceByClass(classroomId!, date!),
    enabled: !!classroomId && !!date,
  });
}

export function useStudentAttendance(studentId?: string) {
  return useQuery({
    queryKey: attendanceKeys.byStudent(studentId),
    queryFn: () => listAttendanceByStudent(studentId!),
    enabled: !!studentId,
  });
}

export function useMarkAttendance() {
  return useMutation({
    mutationFn: markAttendance,
  });
}

