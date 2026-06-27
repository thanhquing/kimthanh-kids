import { TopBar } from "@/components/mobile/MobileShell";
import { cn } from "@/lib/utils";

export function LessonPlanPage() {
  return (
    <>
      <TopBar title="Giáo án tuần" backTo="/teacher/class" />
      <div className="mt-3 space-y-2">
        {["Khám phá màu sắc", "Kỹ năng rửa tay", "Kể chuyện theo tranh", "Vận động ngoài trời"].map((title, index) => (
          <div key={title} className="card p-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold">{title}</div>
              <span className={cn("badge", index < 2 ? "b-green" : "b-amber")}>{index < 2 ? "Đã soạn" : "Cần bổ sung"}</span>
            </div>
            <div className="mt-1 text-xs text-slate-500">Mục tiêu, vật dụng và hoạt động trong ngày.</div>
          </div>
        ))}
      </div>
    </>
  );
}

