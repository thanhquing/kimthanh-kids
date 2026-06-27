import { Calendar, FileText } from "lucide-react";
import { useState } from "react";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { cn } from "@/lib/utils";
import { useMobileState } from "@/lib/mobileState";
import { students, type AttendanceStatus } from "@/mockData";

const statusOptions: AttendanceStatus[] = ["Có mặt", "Muộn", "Vắng", "Phép"];

export function AttendanceMarkPage() {
  const { attendance, setAttendanceStatus } = useMobileState();
  const { toast } = useToast();
  const [noteOpen, setNoteOpen] = useState(false);

  return (
    <>
      <TopBar title="Điểm danh · Lớp Mầm A" backTo="/teacher" />
      <div className="card mb-3 mt-3 flex items-center justify-between p-3">
        <div className="text-sm"><Calendar className="mr-1 inline h-4 w-4" /> Thứ Ba, 26/05/2026</div>
        <span className="badge b-green">24 bé</span>
      </div>
      <div className="space-y-2">
        {students.map((student) => (
          <div key={student.id} className="card p-3">
            <div className="mb-2 flex items-center gap-2">
              <Avatar initials={student.initials} image={student.image} size="sm" />
              <div className="flex-1 text-sm font-semibold">{student.name}</div>
              <button type="button" onClick={() => setNoteOpen(true)}><FileText className="h-4 w-4 text-slate-400" /></button>
            </div>
            <div className="grid grid-cols-4 gap-1">
              {statusOptions.map((status) => (
                <button
                  key={status}
                  type="button"
                  onClick={() => setAttendanceStatus(student.id, status)}
                  className={cn("chip !py-1 !text-xs", attendance[student.id] === status && "active")}
                >
                  {status}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={() => toast("Đã lưu điểm danh")} className="btn-primary mt-4 w-full">Lưu thay đổi ({students.length})</button>
      <BottomSheet open={noteOpen} title="Ghi chú điểm danh" onClose={() => setNoteOpen(false)}>
        <div className="space-y-3">
          <TextAreaField label="Ghi chú" value="Bé đến muộn do kẹt xe. Phụ huynh đã báo trước." />
          <button type="button" className="btn-primary w-full" onClick={() => { toast("Đã lưu ghi chú"); setNoteOpen(false); }}>Lưu ghi chú</button>
        </div>
      </BottomSheet>
    </>
  );
}

