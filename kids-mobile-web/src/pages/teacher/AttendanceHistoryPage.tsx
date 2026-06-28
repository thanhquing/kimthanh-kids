import { useQueries } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { attendanceKeys, listAttendanceByClass } from "@/api/attendance";
import { useClassrooms } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { attendanceStatusLabel } from "@/lib/attendanceDisplay";
import { formatShortDate, recentDateInputs } from "@/lib/date";
import { cn } from "@/lib/utils";

export function AttendanceHistoryPage() {
  const { t, lang } = useT();
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const { data: classrooms = [], isLoading: classroomsLoading, isError: classroomsError } = useClassrooms();
  const activeClassrooms = useMemo(() => classrooms.filter((classroom) => classroom.isActive), [classrooms]);
  const currentClassroom = activeClassrooms.find((classroom) => classroom.id === classroomId) ?? activeClassrooms[0];
  const dates = useMemo(() => recentDateInputs(5), []);
  const historyQueries = useQueries({
    queries: dates.map((date) => ({
      queryKey: attendanceKeys.byClass(currentClassroom?.id, date),
      queryFn: () => listAttendanceByClass(currentClassroom!.id, date),
      enabled: !!currentClassroom,
    })),
  });
  const rows = dates.map((date, index) => ({ date, records: historyQueries[index].data ?? [] }));
  const totalRecords = rows.reduce((sum, row) => sum + row.records.length, 0);
  const presentRecords = rows.reduce(
    (sum, row) => sum + row.records.filter((record) => record.status === "PRESENT" || record.status === "LATE").length,
    0,
  );
  const rate = totalRecords > 0 ? Math.round((presentRecords / totalRecords) * 100) : 0;
  const isLoading = classroomsLoading || historyQueries.some((query) => query.isLoading);
  const isError = classroomsError || historyQueries.some((query) => query.isError);

  useEffect(() => {
    if (!classroomId && activeClassrooms[0]) setClassroomId(activeClassrooms[0].id);
  }, [activeClassrooms, classroomId]);

  return (
    <>
      <TopBar title={t("attendance.historyTitle")} backTo="/teacher/attendance" />
      {activeClassrooms.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
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
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="text-xs opacity-80">{currentClassroom?.name ?? t("attendance.noClass")}</div>
        <div className="mt-1 text-xl font-bold">{t("attendance.rate", { rate })}</div>
      </div>
      <div className="section-title">{t("attendance.recent")}</div>
      {isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card p-4 text-sm text-red-600">{t("attendance.historyError")}</div> : null}
      <div className="space-y-2">
        {rows.map(({ date, records }) => {
          const present = records.filter((record) => record.status === "PRESENT" || record.status === "LATE").length;
          return (
          <div key={date} className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">{formatShortDate(date, lang)}</div>
              <span className="text-xs text-slate-500">
                {records.length ? t("attendance.presentCount", { present, total: records.length }) : t("attendance.noRecord")}
              </span>
            </div>
            <div className="flex flex-wrap gap-2">
              {records.slice(0, 6).map((record) => (
                <StatusBadge
                  key={record.id}
                  status={`${record.student?.fullName?.split(" ").pop() ?? t("attendance.student")} · ${attendanceStatusLabel(record.status, t)}`}
                />
              ))}
            </div>
          </div>
          );
        })}
      </div>
    </>
  );
}
