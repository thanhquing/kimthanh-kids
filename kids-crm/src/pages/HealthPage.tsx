import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { X } from "lucide-react";
import { useState } from "react";
import {
  crm,
  type CreateIncident,
  type IncidentSeverity,
  type MedicineRequest,
  type MedicineStatus,
} from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { cn } from "@/lib/utils";

const todayIso = () => new Date().toISOString().slice(0, 10);

const MED_STATUS: Record<MedicineStatus, { key: TKey; badge: string }> = {
  PENDING: { key: "medicineStatus.PENDING", badge: "b-amber" },
  APPROVED: { key: "medicineStatus.APPROVED", badge: "b-green" },
  ADMINISTERED: { key: "medicineStatus.ADMINISTERED", badge: "b-blue" },
  REJECTED: { key: "medicineStatus.REJECTED", badge: "b-red" },
};
const SEVERITY: Record<IncidentSeverity, { key: TKey; badge: string }> = {
  LOW: { key: "incidentSeverity.LOW", badge: "b-slate" },
  MEDIUM: { key: "incidentSeverity.MEDIUM", badge: "b-amber" },
  HIGH: { key: "incidentSeverity.HIGH", badge: "b-red" },
};

type Tab = "medicine" | "incidents" | "records" | "allergies";
const TABS: { id: Tab; key: TKey }[] = [
  { id: "medicine", key: "health.tabMedicine" },
  { id: "incidents", key: "health.tabIncidents" },
  { id: "records", key: "health.tabRecords" },
  { id: "allergies", key: "health.tabAllergies" },
];

// ─── Thuốc ───
const MED_FILTERS: (MedicineStatus | "")[] = ["", "PENDING", "APPROVED", "ADMINISTERED", "REJECTED"];

function MedicineTab() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [filter, setFilter] = useState<MedicineStatus | "">("");
  const [handling, setHandling] = useState<{ req: MedicineRequest; status: MedicineStatus } | null>(null);
  const [note, setNote] = useState("");

  const medicine = useQuery({ queryKey: ["medicine"], queryFn: () => crm.medicine.list() });
  const list = (medicine.data ?? []).filter((m) => !filter || m.status === filter);

  const handle = useMutation({
    mutationFn: () => crm.medicine.handle(handling!.req.id, { status: handling!.status, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["medicine"] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t("health.medHandled"));
      setHandling(null);
      setNote("");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <div className="flex gap-2 mb-4 flex-wrap">
        {MED_FILTERS.map((f) => (
          <button key={f || "all"} className={cn("chip", filter === f && "active")} onClick={() => setFilter(f)}>
            {f ? t(MED_STATUS[f].key) : t("audit.filterAll")}
          </button>
        ))}
      </div>
      {medicine.isLoading ? (
        <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
      ) : list.length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.medEmpty")}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t("health.medStudent")}</th>
              <th>{t("health.medName")}</th>
              <th>{t("health.medDosage")}</th>
              <th>{t("health.medSchedule")}</th>
              <th>{t("health.medFrom")}</th>
              <th>{t("health.medTo")}</th>
              <th>{t("health.medStatus")}</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {list.map((m) => (
              <tr key={m.id}>
                <td>{m.student.fullName}</td>
                <td>{m.medicineName}</td>
                <td>{m.dosage}</td>
                <td>{m.schedule}</td>
                <td>{formatDate(m.startDate)}</td>
                <td>{formatDate(m.endDate)}</td>
                <td>
                  <span className={`badge ${MED_STATUS[m.status].badge}`}>{t(MED_STATUS[m.status].key)}</span>
                </td>
                <td className="whitespace-nowrap">
                  {m.status === "PENDING" && (
                    <>
                      <button className="text-emerald-600 text-xs font-semibold" onClick={() => setHandling({ req: m, status: "APPROVED" })}>
                        {t("health.medApprove")}
                      </button>
                      <button className="text-red-600 text-xs font-semibold ml-3" onClick={() => setHandling({ req: m, status: "REJECTED" })}>
                        {t("health.medReject")}
                      </button>
                    </>
                  )}
                  {m.status === "APPROVED" && (
                    <button className="text-[color:var(--primary)] text-xs font-semibold" onClick={() => setHandling({ req: m, status: "ADMINISTERED" })}>
                      {t("health.medAdminister")}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {handling && (
        <Modal
          open
          onClose={() => setHandling(null)}
          title={t("health.medHandleTitle")}
          footer={
            <>
              <button className="btn-soft text-sm" onClick={() => setHandling(null)} disabled={handle.isPending}>
                {t("common.cancel")}
              </button>
              <button className="btn-primary text-sm" onClick={() => handle.mutate()} disabled={handle.isPending}>
                {handle.isPending ? t("common.saving") : t(MED_STATUS[handling.status].key)}
              </button>
            </>
          }
        >
          <div className="text-sm">
            {handling.req.student.fullName} · {handling.req.medicineName}
          </div>
          <Field label={t("health.medNote")}>
            <textarea className="field" rows={2} value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ─── Sự cố ───
const SEVERITIES: IncidentSeverity[] = ["LOW", "MEDIUM", "HIGH"];

function IncidentsTab() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const incidents = useQuery({ queryKey: ["incidents"], queryFn: () => crm.incidents.list() });
  const students = useQuery({ queryKey: ["students"], queryFn: () => crm.students.list() });
  const [form, setForm] = useState<CreateIncident>({
    studentId: "",
    date: todayIso(),
    type: "",
    severity: "LOW",
    description: "",
    actionTaken: "",
  });

  const create = useMutation({
    mutationFn: () =>
      crm.incidents.create({ ...form, actionTaken: form.actionTaken || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["incidents"] });
      toast(t("health.incCreated"));
      setOpen(false);
      setForm({ studentId: "", date: todayIso(), type: "", severity: "LOW", description: "", actionTaken: "" });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <div className="flex justify-end mb-4">
        <button className="btn-primary text-sm" onClick={() => setOpen(true)}>
          {t("health.incCreate")}
        </button>
      </div>
      {incidents.isLoading ? (
        <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
      ) : (incidents.data ?? []).length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.incEmpty")}</div>
      ) : (
        <div className="grid md:grid-cols-2 gap-4">
          {(incidents.data ?? []).map((inc) => (
            <div key={inc.id} className="card p-5">
              <div className="flex items-center justify-between mb-1">
                <div className="font-bold">{inc.type}</div>
                <span className={`badge ${SEVERITY[inc.severity].badge}`}>{t(SEVERITY[inc.severity].key)}</span>
              </div>
              <div className="text-xs text-slate-400 mb-2">
                {formatDate(inc.date)} · {inc.student.fullName}
              </div>
              <div className="text-sm text-slate-600">{inc.description}</div>
              {inc.actionTaken && (
                <div className="mt-2 rounded-lg bg-slate-50 p-2 text-xs text-slate-600">
                  <b>{t("health.incActionLabel")}</b> {inc.actionTaken}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={t("health.incFormTitle")}
          footer={
            <>
              <button className="btn-soft text-sm" onClick={() => setOpen(false)} disabled={create.isPending}>
                {t("common.cancel")}
              </button>
              <button
                className="btn-primary text-sm"
                onClick={() => create.mutate()}
                disabled={create.isPending || !form.studentId || !form.type.trim() || !form.description.trim()}
              >
                {create.isPending ? t("common.saving") : t("common.save")}
              </button>
            </>
          }
        >
          <Field label={t("health.medStudent")}>
            <select className="field" value={form.studentId} onChange={(e) => setForm((f) => ({ ...f, studentId: e.target.value }))}>
              <option value="">—</option>
              {(students.data ?? []).map((s) => (
                <option key={s.id} value={s.id}>
                  {s.fullName}
                </option>
              ))}
            </select>
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("health.incType")}>
              <input className="field" value={form.type} onChange={(e) => setForm((f) => ({ ...f, type: e.target.value }))} />
            </Field>
            <Field label={t("health.incSeverity")}>
              <select className="field" value={form.severity} onChange={(e) => setForm((f) => ({ ...f, severity: e.target.value as IncidentSeverity }))}>
                {SEVERITIES.map((s) => (
                  <option key={s} value={s}>
                    {t(SEVERITY[s].key)}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("health.incDate")}>
              <input className="field" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
            </Field>
          </div>
          <Field label={t("health.incDescription")}>
            <textarea className="field" rows={3} value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
          </Field>
          <Field label={t("health.incAction")}>
            <input className="field" value={form.actionTaken} onChange={(e) => setForm((f) => ({ ...f, actionTaken: e.target.value }))} />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ─── Hồ sơ đo lường ───
function StudentSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useT();
  const students = useQuery({ queryKey: ["students"], queryFn: () => crm.students.list() });
  return (
    <select className="field !w-auto !py-1.5 mb-4" value={value} onChange={(e) => onChange(e.target.value)}>
      <option value="">{t("health.pickStudent")}</option>
      {(students.data ?? []).map((s) => (
        <option key={s.id} value={s.id}>
          {s.fullName}
        </option>
      ))}
    </select>
  );
}

function RecordsTab() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ date: todayIso(), heightCm: "", weightKg: "", temperatureC: "", note: "" });

  const records = useQuery({
    queryKey: ["health", studentId],
    queryFn: () => crm.health.byStudent(studentId),
    enabled: !!studentId,
  });

  const create = useMutation({
    mutationFn: () =>
      crm.health.create({
        studentId,
        date: form.date,
        heightCm: form.heightCm ? Number(form.heightCm) : undefined,
        weightKg: form.weightKg ? Number(form.weightKg) : undefined,
        temperatureC: form.temperatureC ? Number(form.temperatureC) : undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["health", studentId] });
      toast(t("health.recSaved"));
      setOpen(false);
      setForm({ date: todayIso(), heightCm: "", weightKg: "", temperatureC: "", note: "" });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  const hasMetric = form.heightCm || form.weightKg || form.temperatureC;

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <StudentSelect value={studentId} onChange={setStudentId} />
        {studentId && (
          <button className="btn-primary text-sm" onClick={() => setOpen(true)}>
            {t("health.recCreate")}
          </button>
        )}
      </div>
      {!studentId ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.pickStudent")}</div>
      ) : (records.data ?? []).length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.recEmpty")}</div>
      ) : (
        <table className="table">
          <thead>
            <tr>
              <th>{t("health.colDate")}</th>
              <th>{t("health.colHeight")}</th>
              <th>{t("health.colWeight")}</th>
              <th>{t("health.colTemp")}</th>
              <th>{t("health.colNote")}</th>
            </tr>
          </thead>
          <tbody>
            {(records.data ?? []).map((r) => (
              <tr key={r.id}>
                <td>{formatDate(r.date)}</td>
                <td>{r.heightCm != null ? `${r.heightCm} cm` : "—"}</td>
                <td>{r.weightKg != null ? `${r.weightKg} kg` : "—"}</td>
                <td>{r.temperatureC != null ? `${r.temperatureC} °C` : "—"}</td>
                <td>{r.note || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={t("health.recFormTitle")}
          footer={
            <>
              <button className="btn-soft text-sm" onClick={() => setOpen(false)} disabled={create.isPending}>
                {t("common.cancel")}
              </button>
              <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={create.isPending || !hasMetric}>
                {create.isPending ? t("common.saving") : t("common.save")}
              </button>
            </>
          }
        >
          <Field label={t("health.recDate")}>
            <input className="field" type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-3 gap-3">
            <Field label={t("health.recHeight")}>
              <input className="field" type="number" value={form.heightCm} onChange={(e) => setForm((f) => ({ ...f, heightCm: e.target.value }))} />
            </Field>
            <Field label={t("health.recWeight")}>
              <input className="field" type="number" value={form.weightKg} onChange={(e) => setForm((f) => ({ ...f, weightKg: e.target.value }))} />
            </Field>
            <Field label={t("health.recTemp")}>
              <input className="field" type="number" value={form.temperatureC} onChange={(e) => setForm((f) => ({ ...f, temperatureC: e.target.value }))} />
            </Field>
          </div>
          <Field label={t("health.recNote")}>
            <input className="field" value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
          </Field>
        </Modal>
      )}
    </>
  );
}

// ─── Dị ứng ───
function AllergiesTab() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [open, setOpen] = useState(false);
  const [allergen, setAllergen] = useState("");
  const [note, setNote] = useState("");
  const [removing, setRemoving] = useState<string | null>(null);

  const allergies = useQuery({
    queryKey: ["allergies", studentId],
    queryFn: () => crm.allergies.byStudent(studentId),
    enabled: !!studentId,
  });

  const add = useMutation({
    mutationFn: () => crm.allergies.create({ studentId, allergen, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergies", studentId] });
      toast(t("health.algAdded"));
      setOpen(false);
      setAllergen("");
      setNote("");
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  const remove = useMutation({
    mutationFn: (id: string) => crm.allergies.remove(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["allergies", studentId] });
      toast(t("health.algRemoved"));
      setRemoving(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <StudentSelect value={studentId} onChange={setStudentId} />
        {studentId && (
          <button className="btn-primary text-sm" onClick={() => setOpen(true)}>
            {t("health.algAdd")}
          </button>
        )}
      </div>
      {!studentId ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.pickStudent")}</div>
      ) : (allergies.data ?? []).length === 0 ? (
        <div className="card p-12 text-center text-sm text-muted">{t("health.algEmpty")}</div>
      ) : (
        <div className="flex flex-wrap gap-2">
          {(allergies.data ?? []).map((a) => (
            <span key={a.id} className="badge b-red !text-sm !py-1.5 !px-3 gap-2">
              {a.allergen}
              {a.note ? <span className="opacity-70">· {a.note}</span> : null}
              <button className="hover:text-red-900" onClick={() => setRemoving(a.id)} aria-label={t("common.delete")}>
                <X className="w-3.5 h-3.5" />
              </button>
            </span>
          ))}
        </div>
      )}

      {open && (
        <Modal
          open
          onClose={() => setOpen(false)}
          title={t("health.algFormTitle")}
          footer={
            <>
              <button className="btn-soft text-sm" onClick={() => setOpen(false)} disabled={add.isPending}>
                {t("common.cancel")}
              </button>
              <button className="btn-primary text-sm" onClick={() => add.mutate()} disabled={add.isPending || !allergen.trim()}>
                {add.isPending ? t("common.saving") : t("common.save")}
              </button>
            </>
          }
        >
          <Field label={t("health.algAllergen")}>
            <input className="field" value={allergen} onChange={(e) => setAllergen(e.target.value)} autoFocus />
          </Field>
          <Field label={t("health.algNote")}>
            <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
          </Field>
        </Modal>
      )}
      <ConfirmDialog
        open={!!removing}
        title={t("common.delete")}
        message={t("health.algRemoveConfirm")}
        confirmLabel={t("common.delete")}
        danger
        busy={remove.isPending}
        onConfirm={() => removing && remove.mutate(removing)}
        onClose={() => setRemoving(null)}
      />
    </>
  );
}

export function HealthPage() {
  const { t } = useT();
  const [tab, setTab] = useState<Tab>("medicine");

  return (
    <>
      <PageHeader title={t("health.title")} section={t("health.section")} />
      <main className="p-6">
        <div className="flex gap-2 mb-5 flex-wrap">
          {TABS.map((it) => (
            <button key={it.id} className={cn("chip", tab === it.id && "active")} onClick={() => setTab(it.id)}>
              {t(it.key)}
            </button>
          ))}
        </div>
        {tab === "medicine" && <MedicineTab />}
        {tab === "incidents" && <IncidentsTab />}
        {tab === "records" && <RecordsTab />}
        {tab === "allergies" && <AllergiesTab />}
      </main>
    </>
  );
}
