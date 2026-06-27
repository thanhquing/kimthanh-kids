import { TopBar } from "@/components/mobile/MobileShell";
import { Field, TextAreaField, TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function MedicineCreatePage() {
  const { toast } = useToast();

  return (
    <>
      <TopBar title="Tạo yêu cầu thuốc" backTo="/parent/medicine" />
      <div className="card mt-3 space-y-3 p-4">
        <Field label="Chọn bé">
          <select className="field">
            <option>Bé Minh - Lớp Mầm A</option>
            <option>Bé An - Lớp Chồi B</option>
          </select>
        </Field>
        <TextField label="Tên thuốc" value="Vitamin C" />
        <TextField label="Liều dùng" value="1 viên/ngày" />
        <TextField label="Thời gian" value="26/05 -> 02/06" />
        <TextAreaField label="Ghi chú" value="Phụ huynh gửi kèm ảnh toa thuốc, nhờ cô cho bé uống sau bữa trưa." />
        <button type="button" className="btn-primary w-full" onClick={() => toast("Đã tạo yêu cầu thuốc mẫu")}>Gửi yêu cầu</button>
      </div>
    </>
  );
}
