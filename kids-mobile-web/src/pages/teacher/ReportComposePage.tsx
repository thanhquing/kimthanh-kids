import { Camera } from "lucide-react";
import { TopBar } from "@/components/mobile/MobileShell";
import { TextAreaField, Field } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { students } from "@/mockData";

export function ReportComposePage() {
  const { toast } = useToast();

  return (
    <>
      <TopBar title="Soạn báo cáo" backTo="/teacher" />
      <div className="card mt-3 space-y-3 p-4">
        <Field label="Học sinh">
          <select className="field" defaultValue="all">
            <option value="all">Cả lớp Mầm A</option>
            {students.map((student) => <option key={student.id}>{student.name}</option>)}
          </select>
        </Field>
        <Field label="Tâm trạng">
          <div className="grid grid-cols-4 gap-2 text-xl">
            {["😊", "😐", "🥱", "😢"].map((mood, index) => (
              <button key={mood} type="button" className={cn("chip !py-2", index === 0 && "active")}>{mood}</button>
            ))}
          </div>
        </Field>
        <TextAreaField label="Bữa ăn" value="Ăn hết suất, cần khuyến khích ăn rau." />
        <TextAreaField label="Ngủ trưa" value="Ngủ ngon 2 giờ." />
        <TextAreaField label="Hoạt động" value="Tô màu, hát cùng nhóm, vận động ngoài trời." />
        <button type="button" className="btn-soft flex w-full justify-center gap-2"><Camera className="h-4 w-4" /> Thêm ảnh</button>
        <button type="button" onClick={() => toast("Đã lưu nháp và gửi báo cáo mẫu")} className="btn-primary w-full">Gửi báo cáo</button>
      </div>
    </>
  );
}

