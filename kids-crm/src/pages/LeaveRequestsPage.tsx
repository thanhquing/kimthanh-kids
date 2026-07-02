import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { crm, type LeaveRequest, type LeaveStatus, type LeaveType } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";

const STATUSES: LeaveStatus[] = ["PENDING", "APPROVED", "REJECTED"];
const STATUS_KEY: Record<LeaveStatus, TKey> = {
  PENDING: "leaveStatus.PENDING",
  APPROVED: "leaveStatus.APPROVED",
  REJECTED: "leaveStatus.REJECTED",
};
const TYPE_KEY: Record<LeaveType, TKey> = {
  SICK: "leaveType.SICK",
  FAMILY: "leaveType.FAMILY",
  OTHER: "leaveType.OTHER",
};

function DecideModal({
  request,
  status,
  onClose,
}: {
  request: LeaveRequest;
  status: Exclude<LeaveStatus, "PENDING">;
  onClose: () => void;
}) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [note, setNote] = useState("");
  const decide = useMutation({
    mutationFn: () => crm.leave.decide(request.id, { status, note: note || undefined }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["leave"] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t(status === "APPROVED" ? "common.approved" : "common.rejected"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });
  return (
    <Modal
      open
      onClose={onClose}
      title={t(STATUS_KEY[status])}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={decide.isPending}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary text-sm" onClick={() => decide.mutate()} disabled={decide.isPending}>
            {decide.isPending ? t("common.saving") : t("common.confirm")}
          </button>
        </>
      }
    >
      <div className="rounded-lg bg-slate-50 p-3 text-sm">
        <div className="font-semibold">{request.student?.fullName}</div>
        <div className="text-slate-500">
          {formatDate(request.startDate)} - {formatDate(request.endDate)}
        </div>
      </div>
      <Field label={t("feature.decisionNote")}>
        <textarea className="field" rows={4} value={note} onChange={(e) => setNote(e.target.value)} autoFocus />
      </Field>
    </Modal>
  );
}

export function LeaveRequestsPage() {
  const { t } = useT();
  const [status, setStatus] = useState<LeaveStatus | "">("PENDING");
  const [deciding, setDeciding] = useState<{ request: LeaveRequest; status: Exclude<LeaveStatus, "PENDING"> } | null>(null);
  const leave = useQuery({
    queryKey: ["leave", status],
    queryFn: () => crm.leave.list(status || undefined),
  });

  return (
    <>
      <PageHeader title={t("feature.leaveTitle")} section={t("feature.leaveSection")} />
      <main className="p-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2">
          <select className="field !w-auto !py-1.5" value={status} onChange={(e) => setStatus(e.target.value as LeaveStatus | "")}>
            <option value="">{t("common.all")}</option>
            {STATUSES.map((s) => (
              <option key={s} value={s}>{t(STATUS_KEY[s])}</option>
            ))}
          </select>
        </div>
        <div className="grid gap-3">
          {leave.isLoading ? (
            <div className="card p-4 text-sm text-slate-400">{t("common.loading")}</div>
          ) : (leave.data ?? []).map((r) => (
            <div key={r.id} className="card p-4">
              <div className="flex flex-wrap items-start gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold">{r.student?.fullName}</h3>
                    <span className="badge b-peach">{t(STATUS_KEY[r.status])}</span>
                  </div>
                  <div className="mt-1 text-sm text-slate-500">
                    {t(TYPE_KEY[r.leaveType])} · {formatDate(r.startDate)} - {formatDate(r.endDate)}
                  </div>
                  {r.reason && <p className="mt-2 text-sm text-slate-700">{r.reason}</p>}
                  {r.decisionNote && <p className="mt-2 text-xs text-slate-400">{r.decisionNote}</p>}
                </div>
                {r.status === "PENDING" && (
                  <div className="flex gap-2">
                    <button className="btn-soft text-sm" onClick={() => setDeciding({ request: r, status: "REJECTED" })}>
                      {t("common.rejected")}
                    </button>
                    <button className="btn-primary text-sm" onClick={() => setDeciding({ request: r, status: "APPROVED" })}>
                      {t("common.approved")}
                    </button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </main>
      {deciding && (
        <DecideModal
          request={deciding.request}
          status={deciding.status}
          onClose={() => setDeciding(null)}
        />
      )}
    </>
  );
}
