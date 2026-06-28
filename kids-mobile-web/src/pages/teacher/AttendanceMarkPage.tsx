import { Calendar, FileText } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  attendanceKeys,
  useAttendanceByClass,
  useMarkAttendance,
  type AttendanceStatus,
} from "@/api/attendance";
import { useClassrooms, useStudents, type Student } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { attendanceStatusLabel, attendanceStatusOptions } from "@/lib/attendanceDisplay";
import { toDateInputValue } from "@/lib/date";
import { initialsFromName } from "@/lib/studentDisplay";
import { cn } from "@/lib/utils";

// Ref ổn định cho fallback rỗng: tránh `?? []` tạo mảng mới mỗi render (sẽ làm effect
// phụ thuộc `students` chạy lại vô hạn khi query chưa có data).
const NO_STUDENTS: Student[] = [];

export function AttendanceMarkPage() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [noteStudentId, setNoteStudentId] = useState<string | null>(null);
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const { data: classrooms = [], isLoading: classroomsLoading } = useClassrooms();
  const activeClassrooms = useMemo(() => classrooms.filter((classroom) => classroom.isActive), [classrooms]);
  const currentClassroom = activeClassrooms.find((classroom) => classroom.id === classroomId) ?? activeClassrooms[0];
  const studentsQuery = useStudents({ classroomId: currentClassroom?.id });
  const attendanceQuery = useAttendanceByClass(currentClassroom?.id, date);
  const markMutation = useMarkAttendance();
  const students = studentsQuery.data ?? NO_STUDENTS;
  const noteStudent = students.find((student) => student.id === noteStudentId);
  // Đánh dấu (lớp|ngày) đã seed: chỉ build lại baseline khi đổi lớp/ngày, không carry-over
  // trạng thái/ghi chú của ngày trước, đồng thời không xoá chỉnh sửa khi query refetch cùng ngày.
  const seededKeyRef = useRef<string | null>(null);

  useEffect(() => {
    if (!classroomId && activeClassrooms[0]) setClassroomId(activeClassrooms[0].id);
  }, [activeClassrooms, classroomId]);

  useEffect(() => {
    if (!currentClassroom || students.length === 0 || attendanceQuery.isLoading) return;
    const key = `${currentClassroom.id}|${date}`;
    if (seededKeyRef.current === key) return; // đã seed cho lớp/ngày này → giữ chỉnh sửa của GV
    const existing = attendanceQuery.data ?? [];
    const nextStatuses: Record<string, AttendanceStatus> = {};
    for (const student of students) {
      nextStatuses[student.id] = existing.find((item) => item.studentId === student.id)?.status ?? "PRESENT";
    }
    const nextNotes: Record<string, string> = {};
    for (const item of existing) {
      if (item.note) nextNotes[item.studentId] = item.note;
    }
    setStatuses(nextStatuses);
    setNotes(nextNotes);
    seededKeyRef.current = key;
  }, [currentClassroom, date, students, attendanceQuery.data, attendanceQuery.isLoading]);

  async function onSave() {
    if (!currentClassroom || students.length === 0) return;
    const result = await markMutation.mutateAsync({
      classroomId: currentClassroom.id,
      date,
      entries: students.map((student) => ({
        studentId: student.id,
        status: statuses[student.id] ?? "PRESENT",
        note: notes[student.id]?.trim() || undefined,
      })),
    });
    await queryClient.invalidateQueries({ queryKey: attendanceKeys.byClass(currentClassroom.id, date) });
    toast(t("attendance.saved", { count: result.marked }));
  }

  return (
    <>
      <TopBar title={currentClassroom ? t("attendance.markTitleWithClass", { name: currentClassroom.name }) : t("attendance.markTitle")} backTo="/teacher" />
      <div className="card mb-3 mt-3 flex items-center justify-between p-3">
        <label className="flex items-center gap-2 text-sm">
          <Calendar className="h-4 w-4" />
          <input
            type="date"
            value={date}
            onChange={(event) => setDate(event.target.value)}
            className="bg-transparent text-sm font-medium outline-none"
          />
        </label>
        <span className="badge b-green">{t("attendance.studentCount", { count: students.length })}</span>
      </div>
      {activeClassrooms.length > 1 ? (
        <div className="mb-3 flex gap-2 overflow-x-auto pb-1">
          {activeClassrooms.map((classroom) => (
            <button
              key={classroom.id}
              type="button"
              onClick={() => setClassroomId(classroom.id)}
              className={cn("chip whitespace-nowrap", currentClassroom?.id === classroom.id && "active")}
            >
              {classroom.name}
            </button>
          ))}
        </div>
      ) : null}
      {classroomsLoading || studentsQuery.isLoading || attendanceQuery.isLoading ? (
        <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div>
      ) : null}
      {studentsQuery.isError || attendanceQuery.isError ? (
        <div className="card p-4 text-sm text-red-600">{t("attendance.loadError")}</div>
      ) : null}
      {!studentsQuery.isLoading && !studentsQuery.isError && currentClassroom && students.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("attendance.emptyClass")}</div>
      ) : null}
      <div className="space-y-2">
        {students.map((student) => (
          <div key={student.id} className="card p-3">
            <div className="mb-2 flex items-center gap-2">
              <Avatar initials={initialsFromName(student.fullName)} image={student.avatarUrl ?? undefined} size="sm" />
              <div className="flex-1 text-sm font-semibold">{student.fullName}</div>
              <button type="button" onClick={() => setNoteStudentId(student.id)} aria-label={t("attendance.note")}>
                <FileText className={cn("h-4 w-4", notes[student.id] ? "text-blue-500" : "text-slate-400")} />
              </button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {attendanceStatusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setStatuses((current) => ({ ...current, [student.id]: status }))}
                  className={cn("chip !py-1 !text-xs", (statuses[student.id] ?? "PRESENT") === status && "active")}
                >
                  {attendanceStatusLabel(status, t)}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button
        type="button"
        onClick={onSave}
        disabled={!currentClassroom || students.length === 0 || markMutation.isPending}
        className="btn-primary mt-4 w-full disabled:opacity-60"
      >
        {markMutation.isPending ? t("attendance.saving") : t("attendance.save", { count: students.length })}
      </button>
      <BottomSheet open={!!noteStudentId} title={t("attendance.noteTitle")} onClose={() => setNoteStudentId(null)}>
        <div className="space-y-3">
          <div className="text-sm font-semibold">{noteStudent?.fullName}</div>
          <TextAreaField
            label={t("attendance.note")}
            value={noteStudentId ? notes[noteStudentId] ?? "" : ""}
            onChange={(value) => {
              if (noteStudentId) setNotes((current) => ({ ...current, [noteStudentId]: value }));
            }}
          />
          <button type="button" className="btn-primary w-full" onClick={() => setNoteStudentId(null)}>
            {t("attendance.noteSave")}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
