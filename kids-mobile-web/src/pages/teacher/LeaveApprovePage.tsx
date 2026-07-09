import { useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import {
  leaveKeys,
  listLeaveRequestsPage,
  useDecideLeaveRequest,
  type LeaveRequest,
  type LeaveStatus,
} from "@/api/leave";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { formatInvoiceDate } from "@/lib/tuitionDisplay";
import { leaveStatusLabel, leaveTypeLabel } from "@/lib/leaveDisplay";

export function LeaveApprovePage() {
  const { t, lang } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const requests = useLoadMore(leaveKeys.staff("PENDING"), (params) =>
    listLeaveRequestsPage("PENDING", params),
  );
  const decide = useDecideLeaveRequest();
  const [target, setTarget] = useState<{ request: LeaveRequest; status: Exclude<LeaveStatus, "PENDING"> } | null>(null);
  const [note, setNote] = useState("");

  async function submitDecision() {
    if (!target) return;
    await decide.mutateAsync({ id: target.request.id, status: target.status, note: note || undefined });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: leaveKeys.all }),
      queryClient.invalidateQueries({ queryKey: leaveKeys.staff("PENDING") }),
    ]);
    toast(target.status === "APPROVED" ? t("leave.approvedToast") : t("leave.rejectedToast"));
    setTarget(null);
    setNote("");
  }

  return (
    <>
      <TopBar title={t("leave.approveTitle")} backTo="/teacher" />
      {requests.isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("leave.listError")}</div> : null}
      {requests.isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {!requests.isLoading && requests.items.length === 0 ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("leave.pendingEmpty")}</div>
      ) : null}
      <div className="mt-3 space-y-2">
        {requests.items.map((request) => (
          <div key={request.id} className="card p-4">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="text-sm font-semibold">{request.student?.fullName ?? t("medicine.student")}</div>
                <div className="text-xs text-slate-500">
                  {leaveTypeLabel(request.leaveType, t)} · {formatInvoiceDate(request.startDate, lang)} - {formatInvoiceDate(request.endDate, lang)}
                </div>
              </div>
              <StatusBadge status={leaveStatusLabel(request.status, t)} />
            </div>
            {request.reason ? <div className="mt-3 text-sm">{request.reason}</div> : null}
            <div className="mt-3 grid grid-cols-2 gap-2">
              <button type="button" className="btn-soft text-red-600" onClick={() => setTarget({ request, status: "REJECTED" })}>
                {t("leave.reject")}
              </button>
              <button type="button" className="btn-primary" onClick={() => setTarget({ request, status: "APPROVED" })}>
                {t("leave.approve")}
              </button>
            </div>
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!requests.hasNextPage}
        loading={requests.isFetchingNextPage}
        onMore={() => void requests.fetchNextPage()}
      />
      <BottomSheet open={!!target} title={target?.status === "APPROVED" ? t("leave.approve") : t("leave.reject")} onClose={() => setTarget(null)}>
        <div className="space-y-4">
          <TextAreaField label={t("leave.decisionNote")} value={note} onChange={setNote} />
          <button type="button" className="btn-primary w-full" onClick={submitDecision} disabled={decide.isPending}>
            {decide.isPending ? t("leave.saving") : t("leave.decisionSubmit")}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
