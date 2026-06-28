import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { leaveKeys, useCreateLeaveRequest, useMyLeaveRequests, type LeaveType } from "@/api/leave";
import { useMyChildren } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";
import { formatInvoiceDate } from "@/lib/tuitionDisplay";
import { leaveStatusLabel, leaveTypeLabel, leaveTypes } from "@/lib/leaveDisplay";

export function LeaveRequestPage() {
  const { t, lang } = useT();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const children = useMyChildren();
  const requestsQuery = useMyLeaveRequests();
  const createMutation = useCreateLeaveRequest();
  const [studentId, setStudentId] = useState("");
  const [leaveType, setLeaveType] = useState<LeaveType>("SICK");
  const [startDate, setStartDate] = useState(toDateInputValue(new Date()));
  const [endDate, setEndDate] = useState(toDateInputValue(new Date()));
  const [reason, setReason] = useState("");
  const selectedStudentId = studentId || children.data?.[0]?.id || "";

  async function onSubmit() {
    if (!selectedStudentId) return;
    await createMutation.mutateAsync({
      studentId: selectedStudentId,
      leaveType,
      startDate,
      endDate,
      reason: reason.trim() || undefined,
    });
    await queryClient.invalidateQueries({ queryKey: leaveKeys.mine() });
    toast(t("leave.saved"));
    setConfirmOpen(true);
  }

  return (
    <>
      <TopBar title={t("leave.title")} backTo="/parent" />
      <div className="card mt-3 space-y-3 p-4">
        {children.isLoading ? <div className="text-sm text-slate-500">{t("common.loading")}</div> : null}
        {children.isError ? <div className="text-sm text-red-600">{t("leave.childrenError")}</div> : null}
        <Field label={t("leave.chooseChild")}>
          <select className="field" value={selectedStudentId} onChange={(event) => setStudentId(event.target.value)}>
            {(children.data ?? []).map((child) => (
              <option key={child.id} value={child.id}>{child.fullName} - {child.classroom?.name ?? t("students.noClass")}</option>
            ))}
          </select>
        </Field>
        <Field label={t("leave.type")}>
          <select className="field" value={leaveType} onChange={(event) => setLeaveType(event.target.value as LeaveType)}>
            {leaveTypes.map((type) => <option key={type} value={type}>{leaveTypeLabel(type, t)}</option>)}
          </select>
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field label={t("medicine.startDate")}>
            <input className="field" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </Field>
          <Field label={t("medicine.endDate")}>
            <input className="field" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </Field>
        </div>
        <TextAreaField label={t("leave.reason")} value={reason} onChange={setReason} />
        <button
          type="button"
          className="btn-primary w-full disabled:opacity-60"
          disabled={!selectedStudentId || createMutation.isPending}
          onClick={onSubmit}
        >
          {createMutation.isPending ? t("leave.saving") : t("leave.submit")}
        </button>
      </div>
      <div className="section-title">{t("leave.recent")}</div>
      <div className="space-y-2">
        {requestsQuery.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
        {requestsQuery.isError ? <div className="card p-4 text-sm text-red-600">{t("leave.listError")}</div> : null}
        {!requestsQuery.isLoading && !requestsQuery.isError && (requestsQuery.data ?? []).length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("leave.empty")}</div>
        ) : null}
        {(requestsQuery.data ?? []).map((request) => (
          <div key={request.id} className="card p-3">
            <div className="flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{request.student?.fullName ?? t("medicine.student")}</div>
              <StatusBadge status={leaveStatusLabel(request.status, t)} />
            </div>
            <div className="mt-1 text-xs text-slate-500">
              {leaveTypeLabel(request.leaveType, t)} · {formatInvoiceDate(request.startDate, lang)} - {formatInvoiceDate(request.endDate, lang)}
            </div>
            {request.reason ? <div className="mt-2 text-sm">{request.reason}</div> : null}
          </div>
        ))}
      </div>
      <BottomSheet open={confirmOpen} title={t("leave.confirmTitle")} onClose={() => setConfirmOpen(false)}>
        <div className="text-sm text-slate-600">
          {t("leave.confirmBody")}
        </div>
      </BottomSheet>
    </>
  );
}
