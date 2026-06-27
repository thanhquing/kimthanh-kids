import { useState } from "react";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { medicines } from "@/mockData";

export function MedicineApprovePage() {
  const [rejectOpen, setRejectOpen] = useState(false);
  const { toast } = useToast();
  const pending = medicines.filter((medicine) => medicine.status === "Chờ duyệt");

  return (
    <>
      <TopBar title="Duyệt yêu cầu thuốc" backTo="/teacher" />
      <div className="mt-3 space-y-3">
        {pending.map((medicine) => (
          <div key={medicine.id} className="card p-4">
            <div className="flex items-center justify-between">
              <div className="font-semibold">{medicine.name}</div>
              <StatusBadge status={medicine.status} />
            </div>
            <div className="mt-1 text-xs text-slate-500">{medicine.studentName} · {medicine.dose}</div>
            <div className="mt-3 text-sm">{medicine.note}</div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="btn-soft text-red-600" onClick={() => setRejectOpen(true)}>Từ chối</button>
              <button type="button" className="btn-primary" onClick={() => toast("Đã duyệt yêu cầu thuốc")}>Duyệt</button>
            </div>
          </div>
        ))}
      </div>
      <BottomSheet open={rejectOpen} title="Từ chối yêu cầu" onClose={() => setRejectOpen(false)}>
        <div className="space-y-3">
          <TextAreaField label="Lý do từ chối" value="Thiếu ảnh toa thuốc hoặc hướng dẫn liều dùng chưa rõ." />
          <button type="button" className="btn-primary w-full" onClick={() => { toast("Đã gửi phản hồi từ chối"); setRejectOpen(false); }}>Gửi phản hồi</button>
        </div>
      </BottomSheet>
    </>
  );
}
