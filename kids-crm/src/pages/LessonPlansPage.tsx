import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type CreateLessonPlan, type LessonPlan } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { usePaged } from "@/hooks/usePaged";
import { useT, type TKey } from "@/i18n";

const blankActivity = { dayOfWeek: 1, startTime: "", title: "", materials: "" };

function LessonModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const [form, setForm] = useState<CreateLessonPlan>({
    classroomId: "",
    week: "",
    theme: "",
    note: "",
    activities: [{ ...blankActivity }],
  });
  const create = useMutation({
    mutationFn: () =>
      crm.lessons.create({
        ...form,
        note: form.note || undefined,
        activities: form.activities?.filter((a) => a.title.trim()).map((a) => ({
          ...a,
          startTime: a.startTime || undefined,
          materials: a.materials || undefined,
        })),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  const valid = form.classroomId && form.week.trim() && form.theme.trim();
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.lessonCreate")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>{t("common.cancel")}</button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={!valid || create.isPending}>
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("classrooms.title")}>
          <select className="field" value={form.classroomId} onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}>
            <option value="">—</option>
            {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
        <Field label={t("feature.weekStart")}>
          <input className="field" value={form.week} onChange={(e) => setForm((f) => ({ ...f, week: e.target.value }))} placeholder="2026-W27" />
        </Field>
      </div>
      <Field label={t("feature.theme")}>
        <input className="field" value={form.theme} onChange={(e) => setForm((f) => ({ ...f, theme: e.target.value }))} autoFocus />
      </Field>
      <Field label={t("feature.note")}>
        <textarea className="field" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>
      {(form.activities ?? []).map((a, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-[80px_90px_1fr] gap-2">
            <select className="field" value={a.dayOfWeek} onChange={(e) => setForm((f) => ({ ...f, activities: f.activities?.map((it, i) => i === idx ? { ...it, dayOfWeek: Number(e.target.value) } : it) }))}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{t(`weekdays.${d}` as TKey)}</option>)}
            </select>
            <input className="field" value={a.startTime} onChange={(e) => setForm((f) => ({ ...f, activities: f.activities?.map((it, i) => i === idx ? { ...it, startTime: e.target.value } : it) }))} placeholder="08:00" />
            <input className="field" value={a.title} onChange={(e) => setForm((f) => ({ ...f, activities: f.activities?.map((it, i) => i === idx ? { ...it, title: e.target.value } : it) }))} placeholder={t("feature.activity")} />
          </div>
          <input className="field mt-2" value={a.materials} onChange={(e) => setForm((f) => ({ ...f, activities: f.activities?.map((it, i) => i === idx ? { ...it, materials: e.target.value } : it) }))} placeholder={t("feature.materials")} />
        </div>
      ))}
      <button className="btn-soft text-sm" onClick={() => setForm((f) => ({ ...f, activities: [...(f.activities ?? []), { ...blankActivity }] }))}>+ {t("feature.activity")}</button>
    </Modal>
  );
}

export function LessonPlansPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [classroomId, setClassroomId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<LessonPlan | null>(null);
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const lessons = usePaged(
    ["lessons", { classroomId }],
    (pg) => crm.lessons.page({ classroomId, ...pg }),
    { pageSize: 50, enabled: !!classroomId },
  );
  const selected = useQuery({ queryKey: ["lesson", selectedId], queryFn: () => crm.lessons.get(selectedId!), enabled: !!selectedId });
  const remove = useMutation({
    mutationFn: (id: string) => crm.lessons.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["lessons"] });
      toast(t("common.deleted"));
      setRemoving(null);
      setSelectedId(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <>
      <PageHeader title={t("feature.lessonsTitle")} section={t("feature.lessonsSection")} />
      <main className="grid gap-4 p-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <select className="field !py-1.5" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">{t("attendance.pickClass")}</option>
              {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>{t("common.create")}</button>
          </div>
          {!classroomId ? (
            <div className="card p-8 text-center text-sm text-slate-400">{t("attendance.pickClass")}</div>
          ) : (
            <>
              {lessons.items.map((l) => (
                <button key={l.id} className="card w-full p-4 text-left hover:border-orange-200" onClick={() => setSelectedId(l.id)}>
                  <div className="font-bold">{l.theme}</div>
                  <div className="text-sm text-slate-500">{l.week} · {l.classroom?.name}</div>
                </button>
              ))}
              <Pagination
                page={lessons.page}
                pages={lessons.pages}
                total={lessons.total}
                onPage={lessons.setPage}
                busy={lessons.isFetching}
              />
            </>
          )}
        </section>
        <section className="card p-5">
          {!selected.data ? (
            <div className="text-sm text-slate-400">{lessons.isLoading ? t("common.loading") : t("common.view")}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold">{selected.data.theme}</h2>
                  <p className="text-sm text-slate-500">{selected.data.week} · {selected.data.classroom?.name}</p>
                </div>
                <button className="text-sm text-red-600" onClick={() => setRemoving(selected.data)}>{t("common.delete")}</button>
              </div>
              {selected.data.note && <p className="text-sm text-slate-600">{selected.data.note}</p>}
              <div className="grid gap-2">
                {(selected.data.activities ?? []).map((a) => (
                  <div key={a.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold uppercase text-slate-400">{t(`weekdays.${a.dayOfWeek}` as TKey)} · {a.startTime ?? "—"}</div>
                    <div className="font-semibold">{a.title}</div>
                    {a.materials && <div className="text-sm text-slate-500">{a.materials}</div>}
                  </div>
                ))}
              </div>
            </div>
          )}
        </section>
      </main>
      {createOpen && <LessonModal onClose={() => setCreateOpen(false)} />}
      <ConfirmDialog open={!!removing} title={t("common.delete")} message={removing?.theme ?? ""} danger busy={remove.isPending} onClose={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
    </>
  );
}
