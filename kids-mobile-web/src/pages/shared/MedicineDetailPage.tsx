import { useParams } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine, StatusBadge } from "@/components/mobile/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";
import { medicines } from "@/mockData";

export function MedicineDetailPage() {
  const { id } = useParams();
  const { role } = useMobileState();
  const { toast } = useToast();
  const medicine = medicines.find((item) => item.id === id) ?? medicines[0];
  const base = roleBase(role);

  return (
    <>
      <TopBar title="Chi tiết yêu cầu thuốc" backTo={`${base}/medicine`} />
      <div className="card mt-3 p-4">
        <div className="flex items-center justify-between">
          <div className="font-semibold">{medicine.name}</div>
          <StatusBadge status={medicine.status} />
        </div>
        <div className="mt-4 space-y-3">
          <InfoLine label="Bé" value={medicine.studentName} />
          <InfoLine label="Liều" value={medicine.dose} />
          <InfoLine label="Thời gian" value={medicine.period} />
          <InfoLine label="Ghi chú" value={medicine.note} />
        </div>
      </div>
      <div className="section-title">Trạng thái</div>
      <div className="card divide-y divide-slate-100">
        {["Phụ huynh tạo yêu cầu", "Giáo viên kiểm tra", medicine.status].map((step) => (
          <div key={step} className="flex items-center gap-3 p-3">
            <span className="h-2 w-2 rounded-full bg-[color:var(--primary)]" />
            <div className="text-sm font-medium">{step}</div>
          </div>
        ))}
      </div>
      {role === "teacher" ? (
        <button type="button" className="btn-primary mt-4 w-full" onClick={() => toast("Đã cập nhật trạng thái uống thuốc")}>Đánh dấu đã cho uống</button>
      ) : null}
    </>
  );
}
