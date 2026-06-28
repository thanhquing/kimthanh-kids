import { Camera } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { reportKeys, useReportsByClass, useUpsertDailyReport, type Mood } from "@/api/reports";
import { useClassrooms, useStudents } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { TextAreaField, Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";
import { moodOptions } from "@/lib/reportDisplay";
import { cn } from "@/lib/utils";

export function ReportComposePage() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [date, setDate] = useState(toDateInputValue(new Date()));
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [studentId, setStudentId] = useState<string | undefined>();
  const [mood, setMood] = useState<Mood>("HAPPY");
  const [meals, setMeals] = useState("");
  const [nap, setNap] = useState("");
  const [activities, setActivities] = useState("");
  const [note, setNote] = useState("");
  const { data: classrooms = [], isLoading: classroomsLoading, isError: classroomsError } = useClassrooms();
  const activeClassrooms = useMemo(() => classrooms.filter((classroom) => classroom.isActive), [classrooms]);
  const currentClassroom = activeClassrooms.find((classroom) => classroom.id === classroomId) ?? activeClassrooms[0];
  const studentsQuery = useStudents({ classroomId: currentClassroom?.id });
  const students = studentsQuery.data ?? [];
  const reportsQuery = useReportsByClass(currentClassroom?.id, date);
  const existingReport = reportsQuery.data?.find((report) => report.studentId === studentId);
  const upsertMutation = useUpsertDailyReport();

  useEffect(() => {
    if (!classroomId && activeClassrooms[0]) setClassroomId(activeClassrooms[0].id);
  }, [activeClassrooms, classroomId]);

  useEffect(() => {
    if (students[0] && !students.some((student) => student.id === studentId)) {
      setStudentId(students[0].id);
    }
  }, [studentId, students]);

  useEffect(() => {
    setMood(existingReport?.mood ?? "HAPPY");
    setMeals(existingReport?.meals ?? "");
    setNap(existingReport?.nap ?? "");
    setActivities(existingReport?.activities ?? "");
    setNote(existingReport?.note ?? "");
  }, [existingReport?.id, existingReport?.mood, existingReport?.meals, existingReport?.nap, existingReport?.activities, existingReport?.note]);

  async function onSubmit() {
    if (!studentId || !currentClassroom) return;
    const report = await upsertMutation.mutateAsync({
      studentId,
      date,
      mood,
      meals: meals.trim() || undefined,
      nap: nap.trim() || undefined,
      activities: activities.trim() || undefined,
      note: note.trim() || undefined,
    });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: reportKeys.byClass(currentClassroom.id, date) }),
      queryClient.invalidateQueries({ queryKey: reportKeys.byStudent(studentId) }),
    ]);
    toast(t("reports.composeSaved", { name: students.find((student) => student.id === report.studentId)?.fullName ?? t("attendance.student") }));
  }

  return (
    <>
      <TopBar title={t("reports.composeTitle")} backTo="/teacher" />
      <div className="card mt-3 space-y-3 p-4">
        {classroomsLoading || studentsQuery.isLoading || reportsQuery.isLoading ? (
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        ) : null}
        {classroomsError || studentsQuery.isError || reportsQuery.isError ? (
          <div className="text-sm text-red-600">{t("reports.composeError")}</div>
        ) : null}
        <Field label={t("reports.date")}>
          <input className="field" type="date" value={date} onChange={(event) => setDate(event.target.value)} />
        </Field>
        <Field label={t("reports.classroom")}>
          <select className="field" value={currentClassroom?.id ?? ""} onChange={(event) => setClassroomId(event.target.value || undefined)}>
            {activeClassrooms.map((classroom) => (
              <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
            ))}
          </select>
        </Field>
        <Field label={t("reports.student")}>
          <select className="field" value={studentId ?? ""} onChange={(event) => setStudentId(event.target.value || undefined)}>
            {students.map((student) => <option key={student.id} value={student.id}>{student.fullName}</option>)}
          </select>
        </Field>
        <Field label={t("reports.mood")}>
          <div className="grid grid-cols-4 gap-2 text-sm font-semibold">
            {moodOptions.map((item) => (
              <button
                key={item.value}
                type="button"
                onClick={() => setMood(item.value)}
                className={cn("chip !py-2", mood === item.value && "active")}
              >
                {item.icon}
              </button>
            ))}
          </div>
        </Field>
        <TextAreaField label={t("reports.meals")} value={meals} onChange={setMeals} />
        <TextAreaField label={t("reports.nap")} value={nap} onChange={setNap} />
        <TextAreaField label={t("reports.activities")} value={activities} onChange={setActivities} />
        <TextAreaField label={t("reports.note")} value={note} onChange={setNote} />
        <button type="button" className="btn-soft flex w-full justify-center gap-2 opacity-70" disabled>
          <Camera className="h-4 w-4" /> {t("reports.addPhoto")}
        </button>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!studentId || upsertMutation.isPending}
          className="btn-primary w-full disabled:opacity-60"
        >
          {upsertMutation.isPending ? t("reports.composeSaving") : t("reports.composeSubmit")}
        </button>
      </div>
    </>
  );
}
