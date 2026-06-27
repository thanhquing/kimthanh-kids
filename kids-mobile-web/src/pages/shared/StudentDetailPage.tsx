import { FileText, Image, Pill } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, InfoLine, QuickAction, StatusBadge } from "@/components/mobile/Primitives";
import { roleBase } from "@/lib/routes";
import { useMobileState } from "@/lib/mobileState";
import { students } from "@/mockData";

export function StudentDetailPage() {
  const { id } = useParams();
  const { role, selectedStudent, setSelectedStudentId } = useMobileState();
  const student = students.find((item) => item.id === id) ?? selectedStudent;
  const base = roleBase(role);
  const backTo = role === "teacher" ? "/teacher/class" : "/parent/children";

  useEffect(() => {
    if (id && students.some((item) => item.id === id)) setSelectedStudentId(id);
  }, [id, setSelectedStudentId]);

  return (
    <>
      <TopBar title="Chi tiết học sinh" backTo={backTo} />
      <div className="mt-3 text-center">
        <Avatar initials={student.initials} image={student.image} size="xl" />
        <div className="mt-3 text-lg font-bold">{student.name}</div>
        <div className="text-xs text-slate-500">{student.className} · {student.age} tuổi</div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuickAction
          icon={FileText}
          label="Báo cáo"
          to={role === "teacher" ? "/teacher/reports/new" : "/parent/reports"}
          tone="orange"
        />
        <QuickAction icon={Pill} label="Thuốc" to={`${base}/medicine`} tone="green" />
        <QuickAction icon={Image} label="Album" to={`${base}/album`} tone="blue" />
      </div>
      <div className="section-title">Hôm nay</div>
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500">Điểm danh</span>
          <StatusBadge status={student.status} />
        </div>
        <InfoLine label="Sức khỏe" value={student.health} />
        <InfoLine label="Nhận xét" value={student.note} />
      </div>
      <div className="section-title">Người đón bé</div>
      <div className="card flex items-center gap-3 p-3">
        <Avatar initials="L" size="md" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Nguyễn Thị Lan</div>
          <div className="text-xs text-slate-500">Mẹ · 0912 345 678</div>
        </div>
        <span className="badge b-green">Đã xác minh</span>
      </div>
    </>
  );
}
