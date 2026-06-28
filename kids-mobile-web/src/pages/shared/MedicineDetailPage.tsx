import { useParams } from "react-router-dom";
import { useQueryClient } from "@tanstack/react-query";
import { medicineKeys, useHandleMedicine, useMedicineDetail, type MedicineStatus } from "@/api/medicine";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine, StatusBadge } from "@/components/mobile/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { formatShortDate } from "@/lib/date";
import { formatDateRange, medicineStatusLabel } from "@/lib/medicineDisplay";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";

export function MedicineDetailPage() {
  const { id } = useParams();
  const { role } = useMobileState();
  const { t, lang } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: medicine, isLoading, isError } = useMedicineDetail(id);
  const handleMutation = useHandleMedicine();
  const base = roleBase(role);

  async function onHandle(status: MedicineStatus) {
    if (!medicine) return;
    await handleMutation.mutateAsync({ id: medicine.id, status });
    // Prefix ["medicine"] cuốn mọi list (kể cả list("teacher","PENDING") + badge TeacherHome) lẫn detail.
    await queryClient.invalidateQueries({ queryKey: medicineKeys.all });
    toast(t("medicine.handleSaved"));
  }

  return (
    <>
      <TopBar title={t("medicine.detailTitle")} backTo={`${base}/medicine`} />
      {isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("medicine.detailError")}</div> : null}
      {medicine ? <div className="card mt-3 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{medicine.medicineName}</div>
          <StatusBadge status={medicineStatusLabel(medicine.status, t)} />
        </div>
        <div className="mt-4 space-y-3">
          <InfoLine label={t("medicine.student")} value={medicine.student?.fullName ?? t("medicine.student")} />
          <InfoLine label={t("medicine.dosageShort")} value={medicine.dosage} />
          <InfoLine label={t("medicine.time")} value={`${formatDateRange(medicine.startDate, medicine.endDate, lang)} · ${medicine.schedule}`} />
          <InfoLine label={t("medicine.reason")} value={medicine.reason || t("reports.notUpdated")} />
        </div>
      </div> : null}
      {medicine ? <><div className="section-title">{t("medicine.statusSection")}</div>
      <div className="card divide-y divide-slate-100">
        {(medicine.history ?? []).map((step) => (
          <div key={step.id} className="flex items-center gap-3 p-3">
            <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" />
            <div className="flex-1">
              <div className="text-sm font-medium">{medicineStatusLabel(step.status, t)}</div>
              <div className="text-xs text-slate-500">{step.note || formatShortDate(step.createdAt, lang)}</div>
            </div>
          </div>
        ))}
      </div>
      {role === "teacher" && medicine.status === "PENDING" ? (
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button type="button" className="btn-soft text-red-600" onClick={() => onHandle("REJECTED")}>{t("medicine.reject")}</button>
          <button type="button" className="btn-primary" onClick={() => onHandle("APPROVED")}>{t("medicine.approve")}</button>
        </div>
      ) : null}
      {role === "teacher" && medicine.status === "APPROVED" ? (
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => onHandle("ADMINISTERED")}>{t("medicine.markAdministered")}</button>
      ) : null}
      </> : null}
    </>
  );
}
