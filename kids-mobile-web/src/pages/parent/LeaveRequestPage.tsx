import { useState } from "react";
import { TopBar } from "@/components/mobile/MobileShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { Field, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function LeaveRequestPage() {
  const [confirmOpen, setConfirmOpen] = useState(false);
  const { toast } = useToast();

  return (
    <>
      <TopBar title="Xin nghỉ học" backTo="/parent" />
      <div className="card mt-3 space-y-3 p-4">
        <Field label="Chọn bé">
          <select className="field">
            <option>Bé Minh - Lớp Mầm A</option>
            <option>Bé An - Lớp Chồi B</option>
          </select>
        </Field>
        <TextField label="Từ ngày" value="27/05/2026" />
        <TextField label="Đến ngày" value="27/05/2026" />
        <TextAreaField label="Lý do" value="Bé sốt nhẹ, gia đình xin cho bé nghỉ theo dõi tại nhà." />
        <button
          type="button"
          className="btn-primary w-full"
          onClick={() => {
            toast("Đã gửi đơn xin nghỉ");
            setConfirmOpen(true);
          }}
        >
          Gửi đơn
        </button>
      </div>
      <BottomSheet open={confirmOpen} title="Đơn xin nghỉ" onClose={() => setConfirmOpen(false)}>
        <div className="text-sm text-slate-600">
          Đơn xin nghỉ đã được gửi tới giáo viên chủ nhiệm. Trạng thái sẽ cập nhật trong thông báo.
        </div>
      </BottomSheet>
    </>
  );
}

