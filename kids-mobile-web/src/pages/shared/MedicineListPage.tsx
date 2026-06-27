import { Plus } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";
import { medicines } from "@/mockData";

export function MedicineListPage() {
  const navigate = useNavigate();
  const { role } = useMobileState();
  const base = roleBase(role);

  return (
    <>
      <TopBar title="Yêu cầu thuốc" rightIcon={role === "parent" ? Plus : undefined} onRight={() => navigate(`${base}/medicine/new`)} />
      <div className="mb-3 mt-3 flex gap-2 overflow-x-auto">
        <span className="chip active">Tất cả</span>
        <span className="chip">Chờ duyệt</span>
        <span className="chip">Đã duyệt</span>
        <span className="chip">Đã cho uống</span>
      </div>
      <div className="space-y-2">
        {medicines.map((medicine) => (
          <NavLink key={medicine.id} to={`${base}/medicine/${medicine.id}`} className="card block p-3 text-left">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="text-sm font-semibold">{medicine.name}</div>
              <StatusBadge status={medicine.status} />
            </div>
            <div className="text-xs text-slate-500">{medicine.studentName} · {medicine.dose}</div>
            <div className="mt-1 text-xs text-slate-400">{medicine.period}</div>
          </NavLink>
        ))}
      </div>
      {role === "teacher" ? <NavLink to="/teacher/medicine/approve" className="btn-primary mt-4 block w-full text-center">Duyệt yêu cầu chờ</NavLink> : null}
    </>
  );
}
