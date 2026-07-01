import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus, X } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { crm } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { GENDER_KEY, STUDENT_STATUS } from "@/lib/people";
import { ageFrom, cn, initials } from "@/lib/utils";

type Tab = "overview" | "attendance" | "reports" | "health" | "tuition" | "photos";
const TABS: { id: Tab; key: TKey }[] = [
  { id: "overview", key: "students.tabOverview" },
  { id: "attendance", key: "students.tabAttendance" },
  { id: "reports", key: "students.tabReports" },
  { id: "health", key: "students.tabHealth" },
  { id: "tuition", key: "students.tabTuition" },
  { id: "photos", key: "students.tabPhotos" },
];

function AddGuardianModal({
  open,
  studentId,
  existingIds,
  onClose,
}: {
  open: boolean;
  studentId: string;
  existingIds: Set<string>;
  onClose: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [parentId, setParentId] = useState("");
  const [relationship, setRelationship] = useState("");
  const [isPrimary, setIsPrimary] = useState(false);

  const parents = useQuery({
    queryKey: ["members"],
    queryFn: () => crm.members.list(),
    select: (rows) => rows.filter((m) => m.role === "PARENT" && !existingIds.has(m.user.id)),
  });

  const add = useMutation({
    mutationFn: () => crm.students.addGuardian(studentId, { parentId, relationship, isPrimary }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", studentId] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={t("students.addGuardian")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={add.isPending}>
            {t("common.cancel")}
          </button>
          <button
            className="btn-primary text-sm"
            onClick={() => add.mutate()}
            disabled={add.isPending || !parentId || !relationship.trim()}
          >
            {add.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <Field label={t("students.guardianSelect")}>
        <select className="field" value={parentId} onChange={(e) => setParentId(e.target.value)}>
          <option value="">—</option>
          {(parents.data ?? []).map((m) => (
            <option key={m.user.id} value={m.user.id}>
              {m.user.fullName} {m.user.phone ? `· ${m.user.phone}` : ""}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("students.guardianRelationship")}>
        <input
          className="field"
          value={relationship}
          onChange={(e) => setRelationship(e.target.value)}
          placeholder={t("students.guardianRelationshipHint")}
        />
      </Field>
      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={isPrimary} onChange={(e) => setIsPrimary(e.target.checked)} />
        {t("students.guardianPrimary")}
      </label>
    </Modal>
  );
}

export function StudentProfilePage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("overview");
  const [addOpen, setAddOpen] = useState(false);

  const student = useQuery({
    queryKey: ["students", id],
    queryFn: () => crm.students.get(id),
    enabled: !!id,
  });
  const s = student.data;

  const removeGuardian = useMutation({
    mutationFn: (parentId: string) => crm.students.removeGuardian(id, parentId),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["students", id] });
      toast(t("common.deleted"));
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  const status = s ? STUDENT_STATUS[s.status] : null;
  const subtitle = s
    ? [s.nickname, t(GENDER_KEY[s.gender]), ageFrom(s.dateOfBirth) != null && t("students.yearsOld", { n: ageFrom(s.dateOfBirth)! })]
        .filter(Boolean)
        .join(" · ")
    : "";

  return (
    <>
      <PageHeader
        title={t("students.profileTitle")}
        section={`${t("students.profileSection")} / ${s?.fullName ?? "…"}`}
      />
      <main className="p-6">
        <div className="grid lg:grid-cols-3 gap-5">
          {/* Thẻ định danh + phụ huynh */}
          <div className="card p-6 text-center">
            <div className="avatar !w-28 !h-28 mx-auto bg-gradient-to-br from-pink-300 to-orange-300 text-2xl mb-3">
              {s ? initials(s.fullName) : "…"}
            </div>
            <div className="text-xl font-bold">{s?.fullName ?? "…"}</div>
            <div className="text-sm text-slate-500">{subtitle}</div>
            {s && <div className="text-xs text-slate-500 mt-1">{formatDate(s.dateOfBirth)}</div>}
            {s?.classroom && <span className="badge b-peach mt-3 inline-block">{s.classroom.name}</span>}
            {status && (
              <span className={`badge ${status.badge} mt-3 ml-2 inline-block`}>{t(status.key)}</span>
            )}

            <div className="border-t border-slate-100 mt-5 pt-5 text-left text-sm space-y-3">
              <div className="flex items-center justify-between">
                <div className="text-xs text-slate-400 uppercase font-semibold">
                  {t("students.guardians")}
                </div>
                <button
                  className="text-[color:var(--primary)] text-xs font-semibold inline-flex items-center gap-1"
                  onClick={() => setAddOpen(true)}
                >
                  <Plus className="w-3.5 h-3.5" />
                  {t("students.addGuardian")}
                </button>
              </div>
              {(s?.parents ?? []).length === 0 && (
                <div className="text-xs text-slate-400">{t("students.noGuardians")}</div>
              )}
              {(s?.parents ?? []).map((g) => (
                <div key={g.parent.id} className="flex items-center gap-2">
                  <div className="avatar !w-8 !h-8 text-xs">{initials(g.parent.fullName)}</div>
                  <div className="flex-1 min-w-0">
                    <div className="font-semibold truncate">{g.parent.fullName}</div>
                    <div className="text-xs text-slate-500">
                      {[g.relationship, g.parent.phone].filter(Boolean).join(" · ")}
                      {g.isPrimary && ` · ${t("students.guardianPrimary")}`}
                    </div>
                  </div>
                  <button
                    className="text-slate-300 hover:text-red-500 shrink-0"
                    onClick={() => removeGuardian.mutate(g.parent.id)}
                    disabled={removeGuardian.isPending}
                    aria-label={t("students.removeGuardian")}
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Tabs */}
          <div className="lg:col-span-2">
            <div className="flex gap-2 mb-4 flex-wrap">
              {TABS.map((tabItem) => (
                <button
                  key={tabItem.id}
                  className={cn("chip", tab === tabItem.id && "active")}
                  onClick={() => setTab(tabItem.id)}
                >
                  {t(tabItem.key)}
                </button>
              ))}
            </div>

            {tab === "overview" ? (
              <div className="card p-5">
                <dl className="grid grid-cols-2 gap-y-4 gap-x-6 text-sm">
                  <Detail label={t("students.fFullName")} value={s?.fullName} />
                  <Detail label={t("students.fNickname")} value={s?.nickname || "—"} />
                  <Detail label={t("students.fDob")} value={s ? formatDate(s.dateOfBirth) : "…"} />
                  <Detail
                    label={t("students.colAge")}
                    value={s && ageFrom(s.dateOfBirth) != null ? String(ageFrom(s.dateOfBirth)) : "—"}
                  />
                  <Detail label={t("students.fGender")} value={s ? t(GENDER_KEY[s.gender]) : "…"} />
                  <Detail
                    label={t("students.fClass")}
                    value={s?.classroom?.name ?? t("students.noClass")}
                  />
                  <Detail label={t("students.fStatus")} value={status ? t(status.key) : "…"} />
                </dl>
              </div>
            ) : (
              <div className="card p-12 text-center text-sm text-muted">{t("students.comingSoon")}</div>
            )}
          </div>
        </div>
      </main>

      {addOpen && s && (
        <AddGuardianModal
          open={addOpen}
          studentId={id}
          existingIds={new Set((s.parents ?? []).map((g) => g.parent.id))}
          onClose={() => setAddOpen(false)}
        />
      )}
    </>
  );
}

function Detail({ label, value }: { label: string; value?: string | null }) {
  return (
    <div>
      <dt className="text-xs text-slate-400 uppercase font-semibold mb-0.5">{label}</dt>
      <dd className="font-medium">{value ?? "…"}</dd>
    </div>
  );
}
