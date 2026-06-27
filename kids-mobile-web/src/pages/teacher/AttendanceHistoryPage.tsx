import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { students } from "@/mockData";

export function AttendanceHistoryPage() {
  return (
    <>
      <TopBar title="Lịch sử điểm danh" backTo="/teacher/attendance" />
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="text-xs opacity-80">Tháng 05/2026</div>
        <div className="mt-1 text-xl font-bold">Tỉ lệ đi học 94%</div>
      </div>
      <div className="section-title">Gần đây</div>
      <div className="space-y-2">
        {["26/05", "25/05", "24/05", "23/05"].map((date, index) => (
          <div key={date} className="card p-3">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-semibold">Thứ {index + 2} · {date}</div>
              <span className="text-xs text-slate-500">20/24 có mặt</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {students.slice(0, 4).map((student) => <StatusBadge key={student.id} status={`${student.name.split(" ").pop()} · ${student.status}`} />)}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

