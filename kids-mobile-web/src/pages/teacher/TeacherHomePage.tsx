import { AlertCircle, CheckSquare, Clock, FileText, Megaphone, Pill } from "lucide-react";
import { GreetingHeader } from "@/components/mobile/MobileShell";
import { QuickAction, ScheduleRow, TaskCard } from "@/components/mobile/Primitives";
import { assets } from "@/mockData";

export function TeacherHomePage() {
  return (
    <>
      <GreetingHeader greeting="Xin chào cô," name="Trần Thu Hà" initials="H" />
      <div className="card brand-grad mt-4 p-4 text-white">
        <div className="text-xs opacity-80">Lớp chủ nhiệm</div>
        <div className="mt-1 text-xl font-bold">Lớp Mầm A · 24 bé</div>
        <div className="mt-3 flex gap-3 text-sm">
          <div>✓ <b>20</b> có mặt</div>
          <div>⏰ <b>2</b> muộn</div>
          <div>✗ <b>2</b> vắng</div>
        </div>
      </div>
      <img src={assets.teacher} alt="Cô giáo lớp Mầm A" className="hero-img mt-3" />
      <div className="section-title">Hành động nhanh</div>
      <div className="grid grid-cols-3 gap-2">
        <QuickAction icon={CheckSquare} label="Điểm danh" to="/teacher/attendance" tone="blue" />
        <QuickAction icon={FileText} label="Báo cáo" to="/teacher/reports/new" tone="orange" />
        <QuickAction icon={Megaphone} label="Thông báo" to="/teacher/announcements/new" tone="green" />
      </div>
      <div className="section-title">Lịch phân công tuần này</div>
      <div className="card p-3">
        <div className="mb-1 flex items-center justify-between">
          <div className="text-sm font-semibold">Thứ 2 · Hôm nay</div>
          <span className="badge b-green">Đang làm</span>
        </div>
        <ScheduleRow label="Sáng" title="Lớp Mầm A" sub="GV chính" color="text-blue-600" />
        <ScheduleRow label="Chiều" title="Trực trưa" sub="Toàn trường" color="text-orange-600" />
        <div className="mt-2 flex gap-1 text-center text-[11px]">
          {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day, index) => (
            <div key={day} className={index === 0 ? "flex-1 rounded-lg bg-[color:var(--primary)] py-1 text-white" : "flex-1 rounded-lg bg-slate-100 py-1 text-slate-500"}>
              {day}
            </div>
          ))}
        </div>
      </div>
      <div className="section-title">Cần xử lý</div>
      <TaskCard icon={AlertCircle} title="4 bé chưa điểm danh hôm nay" sub="Bé Lan, Bé Hùng, Bé Mai, Bé Nam" to="/teacher/attendance" tone="amber" />
      <TaskCard icon={Pill} title="2 yêu cầu thuốc chờ duyệt" sub="Vitamin C, Hapacol 250" to="/teacher/medicine/approve" tone="blue" />
      <TaskCard icon={Clock} title="6 báo cáo còn thiếu" sub="Hạn cuối: 17:30 hôm nay" to="/teacher/reports/new" tone="blue" />
    </>
  );
}

