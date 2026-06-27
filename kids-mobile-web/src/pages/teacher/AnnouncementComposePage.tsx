import { Send } from "lucide-react";
import { TopBar } from "@/components/mobile/MobileShell";
import { Field, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function AnnouncementComposePage() {
  const { toast } = useToast();

  return (
    <>
      <TopBar title="Soạn thông báo" backTo="/teacher" />
      <div className="card mt-3 space-y-3 p-4">
        <Field label="Phạm vi gửi">
          <div className="flex gap-2 overflow-x-auto">
            <span className="chip active">Lớp Mầm A</span>
            <span className="chip">Toàn trường</span>
            <span className="chip">Phụ huynh vắng</span>
          </div>
        </Field>
        <TextField label="Tiêu đề" value="Nhắc chuẩn bị đồ dã ngoại" />
        <TextAreaField label="Nội dung" value="Phụ huynh chuẩn bị nón, bình nước và áo khoác mỏng cho bé vào thứ Sáu." />
        <button type="button" onClick={() => toast("Đã gửi thông báo mẫu")} className="btn-primary flex w-full items-center justify-center gap-2">
          <Send className="h-4 w-4" /> Gửi thông báo
        </button>
      </div>
    </>
  );
}

