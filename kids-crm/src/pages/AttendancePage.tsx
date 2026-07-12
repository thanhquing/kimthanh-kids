import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { crm, type AttendanceStatus } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { fetchAllPages } from "@/lib/fetchAll";
import { cn, initials } from "@/lib/utils";

const STATUSES: { id: AttendanceStatus; key: TKey; active: string }[] = [
  { id: "PRESENT", key: "attendanceStatus.PRESENT", active: "!bg-emerald-500 !text-white !border-emerald-500" },
  { id: "LATE", key: "attendanceStatus.LATE", active: "!bg-amber-500 !text-white !border-amber-500" },
  { id: "ABSENT", key: "attendanceStatus.ABSENT", active: "!bg-red-500 !text-white !border-red-500" },
  { id: "EXCUSED", key: "attendanceStatus.EXCUSED", active: "!bg-slate-500 !text-white !border-slate-500" },
];

type Entry = { status: AttendanceStatus; checkInAt: string; note: string };
const todayIso = () => new Date().toISOString().slice(0, 10);

export function AttendancePage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [classroomId, setClassroomId] = useState("");
  const [date, setDate] = useState(todayIso());
  const [entries, setEntries] = useState<Record<string, Entry>>({});

  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const roster = useQuery({
    queryKey: ["students", { classroomId }, "attendance-all"],
    queryFn: () => fetchAllPages((pg) => crm.students.page({ classroomId, ...pg })),
    enabled: !!classroomId,
  });
  const existing = useQuery({
    queryKey: ["attendance", classroomId, date, "all"],
    queryFn: () => fetchAllPages((pg) => crm.attendance.page({ classroomId, date, ...pg })),
    enabled: !!classroomId && !!date,
  });

  // Khởi tạo entries từ bản ghi đã có (mặc định PRESENT) mỗi khi roster/existing đổi.
  useEffect(() => {
    if (!roster.data) return;
    const byStudent = new Map((existing.data ?? []).map((a) => [a.studentId, a]));
    const next: Record<string, Entry> = {};
    for (const s of roster.data) {
      const rec = byStudent.get(s.id);
      next[s.id] = {
        status: rec?.status ?? "PRESENT",
        checkInAt: rec?.checkInAt ? new Date(rec.checkInAt).toTimeString().slice(0, 5) : "",
        note: rec?.note ?? "",
      };
    }
    setEntries(next);
  }, [roster.data, existing.data]);

  const counts = useMemo(() => {
    const c = { PRESENT: 0, LATE: 0, ABSENT: 0, EXCUSED: 0 };
    for (const e of Object.values(entries)) c[e.status]++;
    return c;
  }, [entries]);

  const save = useMutation({
    mutationFn: () => {
      const list = roster.data ?? [];
      return crm.attendance.mark({
        classroomId,
        date,
        entries: list.map((s) => {
          const e = entries[s.id];
          return {
            studentId: s.id,
            status: e.status,
            checkInAt: e.checkInAt ? new Date(`${date}T${e.checkInAt}:00`).toISOString() : undefined,
            note: e.note || undefined,
          };
        }),
      });
    },
    onSuccess: (res) => {
      qc.invalidateQueries({ queryKey: ["attendance", classroomId, date] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t("attendance.saved", { n: res.marked }));
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const upd = (id: string, patch: Partial<Entry>) =>
    setEntries((m) => ({ ...m, [id]: { ...m[id], ...patch } }));

  const list = roster.data ?? [];

  return (
    <>
      <PageHeader title={t("attendance.title")} section={t("attendance.section")} />
      <main className="p-6">
        <div className="flex items-center gap-3 mb-4 flex-wrap">
          <select
            className="field !w-auto !py-1.5"
            value={classroomId}
            onChange={(e) => setClassroomId(e.target.value)}
          >
            <option value="">{t("attendance.pickClass")}</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <input
            className="field !w-auto !py-1.5"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
          />
          {!!classroomId && (
            <button
              className="btn-primary text-sm ml-auto"
              onClick={() => save.mutate()}
              disabled={save.isPending || list.length === 0}
            >
              {save.isPending ? t("common.saving") : t("attendance.save")}
            </button>
          )}
        </div>

        {!classroomId ? (
          <div className="card p-12 text-center text-sm text-muted">{t("attendance.selectClassFirst")}</div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
              {STATUSES.map((s) => (
                <div key={s.id} className="kpi">
                  <div className="num">{counts[s.id]}</div>
                  <div className="lbl">{t(s.key)}</div>
                </div>
              ))}
            </div>

            {list.length === 0 ? (
              <div className="card p-12 text-center text-sm text-muted">{t("attendance.noStudents")}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("attendance.colStudent")}</th>
                    <th>{t("attendance.colStatus")}</th>
                    <th className="w-28">{t("attendance.colCheckIn")}</th>
                    <th>{t("attendance.colNote")}</th>
                  </tr>
                </thead>
                <tbody>
                  {list.map((s) => {
                    const e = entries[s.id];
                    if (!e) return null;
                    return (
                      <tr key={s.id}>
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="avatar !w-8 !h-8 text-xs">{initials(s.fullName)}</div>
                            {s.fullName}
                          </div>
                        </td>
                        <td>
                          <div className="flex gap-1 flex-wrap">
                            {STATUSES.map((st) => (
                              <button
                                key={st.id}
                                className={cn("chip !py-1 !px-2.5 text-xs", e.status === st.id && st.active)}
                                onClick={() => upd(s.id, { status: st.id })}
                              >
                                {t(st.key)}
                              </button>
                            ))}
                          </div>
                        </td>
                        <td>
                          <input
                            className="field !py-1 !px-2"
                            type="time"
                            value={e.checkInAt}
                            onChange={(ev) => upd(s.id, { checkInAt: ev.target.value })}
                          />
                        </td>
                        <td>
                          <input
                            className="field !py-1 !px-2"
                            value={e.note}
                            onChange={(ev) => upd(s.id, { note: ev.target.value })}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>
    </>
  );
}
