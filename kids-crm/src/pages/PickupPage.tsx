import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type PickupAuthorization, type PickupEventType } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { EntitySelect } from "@/components/ui/EntitySelect";
import { Field, Modal } from "@/components/ui/Modal";
import { LoadMore } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT, type TKey } from "@/i18n";
import { formatDateTime } from "@/lib/labels";

const EVENT_KEY: Record<PickupEventType, TKey> = {
  CHECK_IN: "pickupEvent.CHECK_IN",
  CHECK_OUT: "pickupEvent.CHECK_OUT",
};

function AuthorizationModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    studentId: "",
    guardianName: "",
    guardianPhone: "",
    relationship: "",
    note: "",
  });
  const create = useMutation({
    mutationFn: () =>
      crm.pickup.createAuthorization({
        studentId: form.studentId,
        guardianName: form.guardianName,
        guardianPhone: form.guardianPhone,
        relationship: form.relationship || undefined,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      toast(t("common.created"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  const valid = form.studentId && form.guardianName.trim() && form.guardianPhone.trim();
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.authorizationCreate")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>{t("common.cancel")}</button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={!valid || create.isPending}>
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <Field label={t("students.title")}>
        <EntitySelect
          value={form.studentId}
          fetchPage={(search) => crm.students.page({ search: search || undefined, pageSize: 20 })}
          labelOf={(s) => s.fullName}
          onChange={(id) => setForm((f) => ({ ...f, studentId: id }))}
          queryKey={["students-select", "pickup"]}
          placeholder="—"
        />
      </Field>
      <Field label={t("feature.guardian")}>
        <input className="field" value={form.guardianName} onChange={(e) => setForm((f) => ({ ...f, guardianName: e.target.value }))} autoFocus />
      </Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label={t("feature.guardianPhone")}>
          <input className="field" value={form.guardianPhone} onChange={(e) => setForm((f) => ({ ...f, guardianPhone: e.target.value }))} />
        </Field>
        <Field label={t("feature.relationship")}>
          <input className="field" value={form.relationship} onChange={(e) => setForm((f) => ({ ...f, relationship: e.target.value }))} />
        </Field>
      </div>
      <Field label={t("feature.note")}>
        <textarea className="field" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>
    </Modal>
  );
}

function LogModal({ authorizations, onClose }: { authorizations: PickupAuthorization[]; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [form, setForm] = useState({
    authorizationId: "",
    eventType: "CHECK_OUT" as PickupEventType,
    note: "",
  });
  const create = useMutation({
    mutationFn: () =>
      crm.pickup.createLog({
        authorizationId: form.authorizationId,
        eventType: form.eventType,
        note: form.note || undefined,
      }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-logs"] });
      toast(t("common.saved"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={t("feature.logPickup")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>{t("common.cancel")}</button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={!form.authorizationId || create.isPending}>
            {create.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <Field label={t("feature.guardian")}>
        <select className="field" value={form.authorizationId} onChange={(e) => setForm((f) => ({ ...f, authorizationId: e.target.value }))}>
          <option value="">—</option>
          {authorizations.map((a) => (
            <option key={a.id} value={a.id}>
              {a.student?.fullName} · {a.guardianName} · {a.guardianPhone}
            </option>
          ))}
        </select>
      </Field>
      <Field label={t("feature.eventType")}>
        <select className="field" value={form.eventType} onChange={(e) => setForm((f) => ({ ...f, eventType: e.target.value as PickupEventType }))}>
          {(["CHECK_IN", "CHECK_OUT"] as PickupEventType[]).map((v) => <option key={v} value={v}>{t(EVENT_KEY[v])}</option>)}
        </select>
      </Field>
      <Field label={t("feature.note")}>
        <textarea className="field" rows={3} value={form.note} onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))} />
      </Field>
    </Modal>
  );
}

export function PickupPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [authOpen, setAuthOpen] = useState(false);
  const [logOpen, setLogOpen] = useState(false);
  const [revoking, setRevoking] = useState<PickupAuthorization | null>(null);
  const authorizations = useLoadMore(["pickup-authorizations"], (pg) =>
    crm.pickup.authorizationsPage({ status: "ACTIVE", ...pg }),
  );
  const logs = useLoadMore(["pickup-logs"], (pg) => crm.pickup.logsPage(pg));
  const revoke = useMutation({
    mutationFn: (id: string) => crm.pickup.revokeAuthorization(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pickup-authorizations"] });
      toast(t("common.saved"));
      setRevoking(null);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <PageHeader title={t("feature.pickupTitle")} section={t("feature.pickupSection")} />
      <main className="grid gap-4 p-6 xl:grid-cols-[1fr_1fr]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">{t("feature.guardian")}</h2>
            <button className="btn-primary text-sm" onClick={() => setAuthOpen(true)}>{t("feature.authorizationCreate")}</button>
          </div>
          <div className="divide-y divide-slate-100">
            {authorizations.isLoading ? (
              <div className="p-4 text-sm text-slate-400">{t("common.loading")}</div>
            ) : authorizations.items.map((a) => (
              <div key={a.id} className="p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-semibold">{a.guardianName}</div>
                    <div className="text-sm text-slate-500">{a.guardianPhone} · {a.relationship ?? "—"}</div>
                    <div className="text-sm text-slate-500">{a.student?.fullName} · {a.student?.classroom?.name ?? "—"}</div>
                  </div>
                  <button className="text-xs font-semibold text-red-600" onClick={() => setRevoking(a)}>{t("feature.revoke")}</button>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <LoadMore
              hasMore={authorizations.hasNextPage}
              loading={authorizations.isFetchingNextPage}
              onMore={() => authorizations.fetchNextPage()}
            />
          </div>
        </section>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">{t("feature.logPickup")}</h2>
            <button className="btn-primary text-sm" onClick={() => setLogOpen(true)}>{t("common.create")}</button>
          </div>
          <div className="divide-y divide-slate-100">
            {logs.isLoading ? (
              <div className="p-4 text-sm text-slate-400">{t("common.loading")}</div>
            ) : logs.items.map((l) => (
              <div key={l.id} className="p-4">
                <div className="flex items-start gap-3">
                  <span className="badge b-blue h-fit">{t(EVENT_KEY[l.eventType])}</span>
                  <div className="min-w-0">
                    <div className="font-semibold">{l.student?.fullName}</div>
                    <div className="text-sm text-slate-500">{l.guardianName} · {l.guardianPhone ?? "—"}</div>
                    <div className="text-xs text-slate-400">{formatDateTime(l.occurredAt)}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <LoadMore
              hasMore={logs.hasNextPage}
              loading={logs.isFetchingNextPage}
              onMore={() => logs.fetchNextPage()}
            />
          </div>
        </section>
      </main>
      {authOpen && <AuthorizationModal onClose={() => setAuthOpen(false)} />}
      {logOpen && <LogModal authorizations={authorizations.items} onClose={() => setLogOpen(false)} />}
      <ConfirmDialog
        open={!!revoking}
        title={t("feature.revoke")}
        message={revoking?.guardianName ?? ""}
        danger
        busy={revoke.isPending}
        onClose={() => setRevoking(null)}
        onConfirm={() => revoking && revoke.mutate(revoking.id)}
      />
    </>
  );
}
