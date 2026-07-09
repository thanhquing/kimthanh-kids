import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type CreateWeeklyMenu, type MealType, type WeeklyMenu } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntitySelect } from "@/components/ui/EntitySelect";
import { Field, Modal } from "@/components/ui/Modal";
import { LoadMore } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";

const MEALS: MealType[] = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"];
const MEAL_KEY: Record<MealType, TKey> = {
  BREAKFAST: "mealType.BREAKFAST",
  LUNCH: "mealType.LUNCH",
  SNACK: "mealType.SNACK",
  DINNER: "mealType.DINNER",
};
const blankMeal = { weekday: 1, mealType: "LUNCH" as MealType, name: "", ingredients: "" };

function mondayInput() {
  const d = new Date();
  const diff = d.getDay() === 0 ? -6 : 1 - d.getDay();
  d.setDate(d.getDate() + diff);
  return d.toISOString().slice(0, 10);
}

function MenuModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const [form, setForm] = useState<CreateWeeklyMenu>({
    weekStart: mondayInput(),
    schoolId: "",
    classroomId: "",
    note: "",
    meals: [{ ...blankMeal }],
  });
  const create = useMutation({
    mutationFn: () =>
      crm.menus.create({
        ...form,
        schoolId: form.classroomId ? undefined : form.schoolId || schools.data?.[0]?.id,
        classroomId: form.classroomId || undefined,
        note: form.note || undefined,
        meals: form.meals.filter((m) => m.name.trim()),
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  const valid = form.weekStart && form.meals.some((m) => m.name.trim());

  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.menuCreate")}
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
        <Field label={t("feature.weekStart")}>
          <input className="field" type="date" value={form.weekStart} onChange={(e) => setForm((f) => ({ ...f, weekStart: e.target.value }))} />
        </Field>
        <Field label={t("classrooms.title")}>
          <select className="field" value={form.classroomId} onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}>
            <option value="">—</option>
            {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
          </select>
        </Field>
      </div>
      {!form.classroomId && (
        <Field label={t("common.school")}>
          <select className="field" value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}>
            <option value="">—</option>
            {(schools.data ?? []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
        </Field>
      )}
      <Field label={t("feature.note")}>
        <input className="field" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>
      {form.meals.map((meal, idx) => (
        <div key={idx} className="rounded-lg border border-slate-200 p-3">
          <div className="grid grid-cols-3 gap-2">
            <select className="field" value={meal.weekday} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, weekday: Number(e.target.value) } : m) }))}>
              {[1, 2, 3, 4, 5, 6, 7].map((d) => <option key={d} value={d}>{t(`weekdays.${d}` as TKey)}</option>)}
            </select>
            <select className="field" value={meal.mealType} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, mealType: e.target.value as MealType } : m) }))}>
              {MEALS.map((m) => <option key={m} value={m}>{t(MEAL_KEY[m])}</option>)}
            </select>
            <input className="field" value={meal.name} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, name: e.target.value } : m) }))} placeholder={t("feature.meal")} />
          </div>
          <input className="field mt-2" value={meal.ingredients} onChange={(e) => setForm((f) => ({ ...f, meals: f.meals.map((m, i) => i === idx ? { ...m, ingredients: e.target.value } : m) }))} placeholder={t("feature.ingredients")} />
        </div>
      ))}
      <button className="btn-soft text-sm" onClick={() => setForm((f) => ({ ...f, meals: [...f.meals, { ...blankMeal }] }))}>
        + {t("feature.meal")}
      </button>
    </Modal>
  );
}

export function MenusPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [classroomId, setClassroomId] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<WeeklyMenu | null>(null);
  const [studentId, setStudentId] = useState("");
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const menus = useLoadMore(["menus", classroomId], (pg) =>
    crm.menus.page({ classroomId: classroomId || undefined, ...pg }),
  );
  const selected = useQuery({
    queryKey: ["menu", selectedId],
    queryFn: () => crm.menus.get(selectedId!),
    enabled: !!selectedId,
  });
  const warnings = useQuery({
    queryKey: ["menu-warnings", selectedId, studentId],
    queryFn: () => crm.menus.allergyWarnings(selectedId!, studentId),
    enabled: !!selectedId && !!studentId,
  });
  const remove = useMutation({
    mutationFn: (id: string) => crm.menus.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["menus"] });
      toast(t("common.deleted"));
      setRemoving(null);
      setSelectedId(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <PageHeader title={t("feature.menusTitle")} section={t("feature.menusSection")} />
      <main className="grid gap-4 p-6 lg:grid-cols-[360px_1fr]">
        <section className="space-y-3">
          <div className="flex gap-2">
            <select className="field !py-1.5" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
              <option value="">{t("common.all")}</option>
              {(classrooms.data ?? []).map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
            </select>
            <button className="btn-primary text-sm" onClick={() => setCreateOpen(true)}>{t("common.create")}</button>
          </div>
          {menus.items.map((m) => (
            <button key={m.id} className="card w-full p-4 text-left hover:border-orange-200" onClick={() => setSelectedId(m.id)}>
              <div className="font-bold">{formatDate(m.weekStart)}</div>
              <div className="text-sm text-slate-500">{m.classroom?.name ?? t("audience.ALL")}</div>
            </button>
          ))}
          <LoadMore
            hasMore={menus.hasNextPage}
            loading={menus.isFetchingNextPage}
            onMore={() => menus.fetchNextPage()}
          />
        </section>
        <section className="card p-5">
          {!selected.data ? (
            <div className="text-sm text-slate-400">{menus.isLoading ? t("common.loading") : t("common.view")}</div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-xl font-bold">{formatDate(selected.data.weekStart)}</h2>
                  <p className="text-sm text-slate-500">{selected.data.note}</p>
                </div>
                <button className="text-sm text-red-600" onClick={() => setRemoving(selected.data)}>{t("common.delete")}</button>
              </div>
              <div className="grid gap-2 md:grid-cols-2">
                {(selected.data.meals ?? []).map((m) => (
                  <div key={m.id} className="rounded-lg border border-slate-200 p-3">
                    <div className="text-xs font-semibold uppercase text-slate-400">{t(`weekdays.${m.weekday}` as TKey)} · {t(MEAL_KEY[m.mealType])}</div>
                    <div className="font-semibold">{m.name}</div>
                    {m.ingredients && <div className="text-sm text-slate-500">{m.ingredients}</div>}
                  </div>
                ))}
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <div className="mb-2 text-sm font-semibold">{t("feature.allergyCheck")}</div>
                <EntitySelect
                  value={studentId}
                  fetchPage={(search) =>
                    crm.students.page({
                      classroomId: selected.data.classroomId ?? undefined,
                      search: search || undefined,
                      pageSize: 20,
                    })
                  }
                  labelOf={(s) => s.fullName}
                  onChange={setStudentId}
                  queryKey={["students-select", "menu-warning", selected.data.classroomId]}
                  placeholder="—"
                />
                {studentId && (
                  <div className="mt-2 text-sm">
                    {(warnings.data?.warnings.length ?? 0) === 0
                      ? t("feature.noWarnings")
                      : warnings.data?.warnings.map((w) => (
                          <div key={w.mealId} className="text-amber-700">{w.name}: {w.matched.join(", ")}</div>
                        ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </section>
      </main>
      {createOpen && <MenuModal onClose={() => setCreateOpen(false)} />}
      <ConfirmDialog open={!!removing} title={t("common.delete")} message={removing?.note ?? removing?.id ?? ""} danger busy={remove.isPending} onClose={() => setRemoving(null)} onConfirm={() => removing && remove.mutate(removing.id)} />
    </>
  );
}
