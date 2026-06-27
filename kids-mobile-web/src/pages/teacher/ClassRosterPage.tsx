import { Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, Kpi, StatusBadge } from "@/components/mobile/Primitives";
import { students } from "@/mockData";

export function ClassRosterPage() {
  return (
    <>
      <TopBar title="Sĩ số Lớp Mầm A" rightIcon={Search} />
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Kpi num="24" label="Tổng bé" />
        <Kpi num="20" label="Có mặt" />
        <Kpi num="4" label="Cần xử lý" />
      </div>
      <div className="section-title">Danh sách lớp</div>
      <div className="space-y-2">
        {students.map((student) => (
          <NavLink key={student.id} to={`/teacher/student/${student.id}`} className="card flex items-center gap-3 p-3 text-left">
            <Avatar initials={student.initials} image={student.image} size="md" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{student.name}</div>
              <div className="text-xs text-slate-500">{student.health}</div>
            </div>
            <StatusBadge status={student.status} />
          </NavLink>
        ))}
      </div>
      <div className="mt-4 grid grid-cols-2 gap-2">
        <NavLink to="/teacher/lesson-plan" className="btn-soft text-center">Giáo án tuần</NavLink>
        <NavLink to="/teacher/medicine/approve" className="btn-soft text-center">Duyệt thuốc</NavLink>
      </div>
    </>
  );
}
