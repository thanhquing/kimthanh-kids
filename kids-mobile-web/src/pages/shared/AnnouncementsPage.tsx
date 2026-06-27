import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { useMobileState } from "@/lib/mobileState";
import { cn } from "@/lib/utils";
import { announcements } from "@/mockData";

export function AnnouncementsPage() {
  const navigate = useNavigate();
  const { role } = useMobileState();

  return (
    <>
      <TopBar
        title="Thông báo"
        rightIcon={role === "teacher" ? Plus : undefined}
        onRight={() => navigate("/teacher/announcements/new")}
      />
      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        <span className="chip active">Tất cả</span>
        <span className="chip">Lớp</span>
        <span className="chip">Trường</span>
        <span className="chip">Bếp</span>
      </div>
      <div className="mt-3 space-y-2">
        {announcements.map((announcement) => (
          <div key={announcement.id} className="card p-3">
            <div className="flex items-start gap-3">
              <span className={cn("badge", announcement.scope === "Trường" ? "b-blue" : "b-peach")}>{announcement.scope}</span>
              <span className="ml-auto text-xs text-slate-400">{announcement.time}</span>
            </div>
            <div className="mt-1 text-sm font-semibold">{announcement.title}</div>
            <div className="mt-1 text-xs text-slate-500">{announcement.body}</div>
          </div>
        ))}
      </div>
    </>
  );
}
