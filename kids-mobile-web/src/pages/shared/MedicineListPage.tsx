import { Plus } from "lucide-react";
import { useState } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { listMedicinePage, medicineKeys, type MedicineStatus } from "@/api/medicine";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { LoadMore } from "@/components/ui/LoadMore";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { formatDateRange, medicineStatusFilters, medicineStatusLabel } from "@/lib/medicineDisplay";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";

export function MedicineListPage() {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { role } = useMobileState();
  const appRole = role === "teacher" ? "teacher" : "parent";
  const base = roleBase(role);
  const [status, setStatus] = useState<MedicineStatus | "ALL">("ALL");
  const serverStatus = appRole === "teacher" && status !== "ALL" ? status : undefined;
  const query = useLoadMore(
    medicineKeys.list(appRole, serverStatus),
    (params) => listMedicinePage(appRole, serverStatus, params),
  );
  const requests = query.items;
  const visibleRequests =
    appRole === "parent" && status !== "ALL" ? requests.filter((item) => item.status === status) : requests;

  return (
    <>
      <TopBar title={t("medicine.title")} rightIcon={role === "parent" ? Plus : undefined} onRight={() => navigate(`${base}/medicine/new`)} />
      <div className="mb-3 mt-3 flex gap-2 overflow-x-auto">
        {medicineStatusFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setStatus(item)}
            className={`chip whitespace-nowrap ${status === item ? "active" : ""}`}
          >
            {medicineStatusLabel(item, t)}
          </button>
        ))}
      </div>
      {query.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {query.isError ? <div className="card p-4 text-sm text-red-600">{t("medicine.listError")}</div> : null}
      {!query.isLoading && !query.isError && visibleRequests.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("medicine.listEmpty")}</div>
      ) : null}
      <div className="space-y-2">
        {visibleRequests.map((medicine) => (
          <NavLink key={medicine.id} to={`${base}/medicine/${medicine.id}`} className="card block p-3 text-left">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{medicine.medicineName}</div>
              <StatusBadge status={medicineStatusLabel(medicine.status, t)} />
            </div>
            <div className="text-xs text-slate-500">{medicine.student?.fullName ?? t("medicine.student")} · {medicine.dosage}</div>
            <div className="mt-1 text-xs text-slate-400">{formatDateRange(medicine.startDate, medicine.endDate, lang)} · {medicine.schedule}</div>
          </NavLink>
        ))}
      </div>
      <LoadMore
        hasMore={!!query.hasNextPage}
        loading={query.isFetchingNextPage}
        onMore={() => void query.fetchNextPage()}
      />
      {role === "teacher" ? <NavLink to="/teacher/medicine/approve" className="btn-primary mt-4 block w-full text-center">{t("medicine.approvePending")}</NavLink> : null}
    </>
  );
}
