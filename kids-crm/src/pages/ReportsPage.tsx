import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type CreateReport, type Mood, type Student } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { cn, initials } from "@/lib/utils";

const MOODS: { id: Mood; key: TKey; emoji: string }[] = [
  { id: "HAPPY", key: "mood.HAPPY", emoji: "😊" },
  { id: "NEUTRAL", key: "mood.NEUTRAL", emoji: "😐" },
  { id: "TIRED", key: "mood.TIRED", emoji: "😴" },
  { id: "FUSSY", key: "mood.FUSSY", emoji: "😤" },
];
const MOOD_EMOJI: Record<string, string> = Object.fromEntries(MOODS.map((m) => [m.id, m.emoji]));
const todayIso = () => new Date().toISOString().slice(0, 10);

function ReportForm({ student, onClose }: { student: Student; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState<CreateReport>({
    studentId: student.id,
    date: todayIso(),
    mood: "HAPPY",
    meals: "",
    nap: "",
    activities: "",
    note: "",
  });
  const set = (k: keyof CreateReport) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () =>
      crm.reports.create({
        ...form,
        meals: form.meals || undefined,
        nap: form.nap || undefined,
        activities: form.activities || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["reports", "student", student.id] });
      toast(t("reports.saved"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={`${t("reports.formTitle")} · ${student.fullName}`}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={save.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => save.mutate()}
            disabled={save.isPending || !/^\d{4}-\d{2}-\d{2}$/.test(form.date)}
          >
            {save.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("reports.fDate")}>
          <input className="field" type="date" value={form.date} onChange={set("date")} />
        </Field>
        <Field label={t("reports.fMood")}>
          <select className="field" value={form.mood} onChange={set("mood")}>
            {MOODS.map((m) => (
              <option key={m.id} value={m.id}>
                {m.emoji} {t(m.key)}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("reports.fMeals")}>
        <input className="field" value={form.meals} onChange={set("meals")} />
      </Field>
      <Field label={t("reports.fNap")}>
        <input className="field" value={form.nap} onChange={set("nap")} />
      </Field>
      <Field label={t("reports.fActivities")}>
        <input className="field" value={form.activities} onChange={set("activities")} />
      </Field>
      <Field label={t("reports.fNote")}>
        <textarea className="field" rows={2} value={form.note} onChange={set("note")} />
      </Field>
    </Modal>
  );
}

export function ReportsPage() {
  const { t } = useT();
  const [classroomId, setClassroomId] = useState("");
  const [selected, setSelected] = useState<Student | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);

  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const roster = useQuery({
    queryKey: ["students", { classroomId }],
    queryFn: () => crm.students.list({ classroomId }),
    enabled: !!classroomId,
  });
  const reports = useQuery({
    queryKey: ["reports", "student", selected?.id],
    queryFn: () => crm.reports.byStudent(selected!.id),
    enabled: !!selected,
  });

  return (
    <>
      <PageHeader title={t("reports.title")} section={t("reports.section")} />
      <main className="p-6">
        <div className="mb-4">
          <select
            className="field !w-auto !py-1.5"
            value={classroomId}
            onChange={(e) => {
              setClassroomId(e.target.value);
              setSelected(null);
            }}
          >
            <option value="">{t("reports.pickClass")}</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        {!classroomId ? (
          <div className="card p-12 text-center text-sm text-muted">{t("reports.selectClassFirst")}</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="card p-3 max-h-[70vh] overflow-y-auto">
              {(roster.data ?? []).map((s) => (
                <button
                  key={s.id}
                  onClick={() => setSelected(s)}
                  className={cn(
                    "w-full flex items-center gap-2 rounded-xl px-2 py-2 text-left text-sm",
                    selected?.id === s.id ? "bg-[#fff3ec]" : "hover:bg-slate-50",
                  )}
                >
                  <div className="avatar !w-8 !h-8 text-xs">{initials(s.fullName)}</div>
                  <span className="flex-1 truncate font-medium">{s.fullName}</span>
                </button>
              ))}
              {(roster.data ?? []).length === 0 && (
                <div className="py-8 text-center text-sm text-muted">{t("attendance.noStudents")}</div>
              )}
            </div>

            <div className="lg:col-span-2">
              {!selected ? (
                <div className="card p-12 text-center text-sm text-muted">{t("reports.pickStudent")}</div>
              ) : (
                <>
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="text-lg font-bold">{selected.fullName}</div>
                      <div className="text-xs text-slate-400">
                        {t("reports.reportCount", { n: reports.data?.length ?? 0 })}
                      </div>
                    </div>
                    <button className="btn-primary text-sm" onClick={() => setComposeOpen(true)}>
                      {t("reports.create")}
                    </button>
                  </div>
                  {reports.isLoading ? (
                    <div className="text-sm text-muted py-8 text-center">{t("common.loading")}</div>
                  ) : (reports.data ?? []).length === 0 ? (
                    <div className="card p-12 text-center text-sm text-muted">{t("reports.noReports")}</div>
                  ) : (
                    <div className="space-y-3">
                      {(reports.data ?? []).map((r) => (
                        <div key={r.id} className="card p-4">
                          <div className="flex items-center gap-2 mb-2">
                            <span className="text-xl">{r.mood ? MOOD_EMOJI[r.mood] : "📝"}</span>
                            <div className="font-semibold text-sm">{formatDate(r.date)}</div>
                          </div>
                          <div className="grid grid-cols-3 gap-3 text-xs">
                            <ReportCell label={t("reports.fMeals")} value={r.meals} />
                            <ReportCell label={t("reports.fNap")} value={r.nap} />
                            <ReportCell label={t("reports.fActivities")} value={r.activities} />
                          </div>
                          {r.note && <div className="mt-2 text-xs text-slate-500">{r.note}</div>}
                        </div>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        )}
      </main>

      {composeOpen && selected && <ReportForm student={selected} onClose={() => setComposeOpen(false)} />}
    </>
  );
}

function ReportCell({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <div className="text-slate-400 uppercase font-semibold text-[10px] mb-0.5">{label}</div>
      <div className="text-slate-700">{value || "—"}</div>
    </div>
  );
}
