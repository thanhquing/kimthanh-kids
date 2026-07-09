import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { listMedicinePage, medicineKeys, useHandleMedicine } from "@/api/medicine";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { LoadMore } from "@/components/ui/LoadMore";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { medicineStatusLabel } from "@/lib/medicineDisplay";

export function MedicineApprovePage() {
  const { t } = useT();
  const [rejectId, setRejectId] = useState<string | null>(null);
  const [rejectNote, setRejectNote] = useState("");
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const pendingQuery = useLoadMore(medicineKeys.list("teacher", "PENDING"), (params) =>
    listMedicinePage("teacher", "PENDING", params),
  );
  const pending = pendingQuery.items;
  const handleMutation = useHandleMedicine();

  async function handle(id: string, status: "APPROVED" | "REJECTED", note?: string) {
    await handleMutation.mutateAsync({ id, status, note: note?.trim() || undefined });
    await Promise.all([
      queryClient.invalidateQueries({ queryKey: medicineKeys.list("teacher", "PENDING") }),
      queryClient.invalidateQueries({ queryKey: medicineKeys.list("teacher") }),
      queryClient.invalidateQueries({ queryKey: medicineKeys.detail(id) }),
    ]);
    toast(status === "APPROVED" ? t("medicine.approvedToast") : t("medicine.rejectedToast"));
  }

  return (
    <>
      <TopBar title={t("medicine.approveTitle")} backTo="/teacher" />
      <div className="mt-3 space-y-3">
        {pendingQuery.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
        {pendingQuery.isError ? <div className="card p-4 text-sm text-red-600">{t("medicine.listError")}</div> : null}
        {!pendingQuery.isLoading && !pendingQuery.isError && pending.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("medicine.pendingEmpty")}</div>
        ) : null}
        {pending.map((medicine) => (
          <div key={medicine.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{medicine.medicineName}</div>
              <StatusBadge status={medicineStatusLabel(medicine.status, t)} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{medicine.student?.fullName ?? t("medicine.student")} · {medicine.dosage}</div>
            <div className="mt-3 text-sm">{medicine.reason || t("reports.notUpdated")}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn-soft text-red-600" onClick={() => setRejectId(medicine.id)}>{t("medicine.reject")}</button>
              <button type="button" className="btn-primary" onClick={() => handle(medicine.id, "APPROVED")}>{t("medicine.approve")}</button>
            </div>
          </div>
        ))}
      </div>
      <LoadMore
        hasMore={!!pendingQuery.hasNextPage}
        loading={pendingQuery.isFetchingNextPage}
        onMore={() => void pendingQuery.fetchNextPage()}
      />
      <BottomSheet open={!!rejectId} title={t("medicine.rejectTitle")} onClose={() => setRejectId(null)}>
        <div className="space-y-3">
          <TextAreaField label={t("medicine.rejectReason")} value={rejectNote} onChange={setRejectNote} />
          <button
            type="button"
            className="btn-primary w-full"
            onClick={async () => {
              if (rejectId) await handle(rejectId, "REJECTED", rejectNote);
              setRejectId(null);
              setRejectNote("");
            }}
          >
            {t("medicine.rejectSubmit")}
          </button>
        </div>
      </BottomSheet>
    </>
  );
}
