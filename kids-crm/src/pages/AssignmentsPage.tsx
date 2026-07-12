import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type Assignment, type CreateAssignment, type Shift } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntitySelect } from "@/components/ui/EntitySelect";
import { Field, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { usePaged } from "@/hooks/usePaged";
import { useT, type TKey } from "@/i18n";

const SHIFTS: Shift[] = ["MORNING", "AFTERNOON", "FULL_DAY"];
const SHIFT_KEY: Record<Shift, TKey> = {
  MORNING: "shift.MORNING",
  AFTERNOON: "shift.AFTERNOON",
  FULL_DAY: "shift.FULL_DAY",
};

function CreateAssignmentModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const [staffLabel, setStaffLabel] = useState("");
  const [form, setForm] = useState<CreateAssignment>({
    staffId: "",
    schoolId: "",
    classroomId: "",
    weekday: 1,
    shift: "MORNING",
    duty: "",
    note: "",
  });

  const create = useMutation({
    mutationFn: () =>
      crm.assignments.create({
        ...form,
        schoolId: form.classroomId ? undefined : form.schoolId || schools.data?.[0]?.id,
        classroomId: form.classroomId || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const valid = form.staffId && form.weekday && form.shift && form.duty.trim();

  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.assignmentCreate")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={!valid || create.isPending}>
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <Field label={t("feature.staff")}>
        <EntitySelect
          value={form.staffId}
          selectedLabel={staffLabel}
          fetchPage={(s) =>
            crm.members.page({ search: s || undefined, staffOnly: true, isActive: true, pageSize: 20 })
          }
          labelOf={(m) => m.user.fullName}
          idOf={(m) => m.user.id}
          onChange={(id, m) => {
            setForm((f) => ({ ...f, staffId: id }));
            setStaffLabel(m ? m.user.fullName : "");
          }}
          queryKey={["members", "assignment-form"]}
        />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("classrooms.title")}>
          <select className="field" value={form.classroomId} onChange={(e) => setForm((f) => ({ ...f, classroomId: e.target.value }))}>
            <option value="">—</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </Field>
        {!form.classroomId && (
          <Field label={t("common.school")}>
            <select className="field" value={form.schoolId} onChange={(e) => setForm((f) => ({ ...f, schoolId: e.target.value }))}>
              <option value="">—</option>
              {(schools.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </Field>
        )}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("feature.weekday")}>
          <select className="field" value={form.weekday} onChange={(e) => setForm((f) => ({ ...f, weekday: Number(e.target.value) }))}>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {t(`weekdays.${d}` as TKey)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("feature.shift")}>
          <select className="field" value={form.shift} onChange={(e) => setForm((f) => ({ ...f, shift: e.target.value as Shift }))}>
            {SHIFTS.map((s) => (
              <option key={s} value={s}>
                {t(SHIFT_KEY[s])}
              </option>
            ))}
          </select>
        </Field>
      </div>
      <Field label={t("feature.duty")}>
        <input className="field" value={form.duty} onChange={(e) => setForm((f) => ({ ...f, duty: e.target.value }))} autoFocus />
      </Field>
      <Field label={t("feature.note")}>
        <textarea className="field" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>
    </Modal>
  );
}

export function AssignmentsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [staffId, setStaffId] = useState("");
  const [staffLabel, setStaffLabel] = useState("");
  const [classroomId, setClassroomId] = useState("");
  const [weekday, setWeekday] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [removing, setRemoving] = useState<Assignment | null>(null);
  const classrooms = useQuery({ queryKey: ["classrooms"], queryFn: () => crm.classrooms.list() });
  const listFilters = {
    staffId: staffId || undefined,
    classroomId: classroomId || undefined,
    weekday: weekday ? Number(weekday) : undefined,
  };
  const assignments = usePaged(
    ["assignments", listFilters],
    (pg) => crm.assignments.page({ ...listFilters, ...pg }),
  );
  const remove = useMutation({
    mutationFn: (id: string) => crm.assignments.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["assignments"] });
      toast(t("common.deleted"));
      setRemoving(null);
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  return (
    <>
      <PageHeader title={t("feature.assignmentsTitle")} section={t("feature.assignmentsSection")} />
      <main className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-3">
          <div className="w-48">
            <EntitySelect
              value={staffId}
              selectedLabel={staffLabel}
              fetchPage={(s) =>
                crm.members.page({ search: s || undefined, staffOnly: true, isActive: true, pageSize: 20 })
              }
              labelOf={(m) => m.user.fullName}
              idOf={(m) => m.user.id}
              onChange={(id, m) => {
                setStaffId(id);
                setStaffLabel(m ? m.user.fullName : "");
              }}
              queryKey={["members", "assignment-filter"]}
              placeholder={t("feature.staff")}
            />
          </div>
          <select className="field !w-auto !py-1.5" value={classroomId} onChange={(e) => setClassroomId(e.target.value)}>
            <option value="">{t("classrooms.title")}</option>
            {(classrooms.data ?? []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <select className="field !w-auto !py-1.5" value={weekday} onChange={(e) => setWeekday(e.target.value)}>
            <option value="">{t("feature.weekday")}</option>
            {[1, 2, 3, 4, 5, 6, 7].map((d) => (
              <option key={d} value={d}>
                {t(`weekdays.${d}` as TKey)}
              </option>
            ))}
          </select>
          <button className="btn-primary text-sm ml-auto" onClick={() => setCreateOpen(true)}>
            {t("feature.assignmentCreate")}
          </button>
        </div>
        <div className="card overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase text-slate-400">
                <th className="p-4">{t("feature.weekday")}</th>
                <th>{t("feature.shift")}</th>
                <th>{t("feature.staff")}</th>
                <th>{t("classrooms.title")}</th>
                <th>{t("feature.duty")}</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {assignments.isLoading ? (
                <tr><td className="p-4 text-slate-400" colSpan={6}>{t("common.loading")}</td></tr>
              ) : assignments.items.map((a) => (
                <tr key={a.id} className="border-t border-slate-100">
                  <td className="p-4 font-semibold">{t(`weekdays.${a.weekday}` as TKey)}</td>
                  <td>{t(SHIFT_KEY[a.shift])}</td>
                  <td>{a.staff?.fullName ?? a.staffId}</td>
                  <td>{a.classroom?.name ?? "—"}</td>
                  <td>
                    <div className="font-medium">{a.duty}</div>
                    {a.note && <div className="text-xs text-slate-400">{a.note}</div>}
                  </td>
                  <td className="text-right pr-4">
                    <button className="text-xs text-red-600" onClick={() => setRemoving(a)}>{t("common.delete")}</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Pagination
          page={assignments.page}
          pages={assignments.pages}
          total={assignments.total}
          onPage={assignments.setPage}
          busy={assignments.isFetching}
        />
      </main>
      {createOpen && <CreateAssignmentModal onClose={() => setCreateOpen(false)} />}
      <ConfirmDialog
        open={!!removing}
        title={t("common.delete")}
        message={removing?.duty ?? ""}
        danger
        busy={remove.isPending}
        onClose={() => setRemoving(null)}
        onConfirm={() => removing && remove.mutate(removing.id)}
      />
    </>
  );
}
