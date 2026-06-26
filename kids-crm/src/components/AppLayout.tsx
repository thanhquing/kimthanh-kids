import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Receipt,
  Settings,
  Users,
  X,
} from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { group: null, items: [{ to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true }] },
  {
    group: "Hồ sơ",
    items: [
      { to: "/classrooms", label: "Lớp học", icon: BookOpen },
      { to: "/students", label: "Học sinh", icon: Users },
      { to: "/members", label: "Nhân sự", icon: ClipboardList },
    ],
  },
  {
    group: "Vận hành",
    items: [
      { to: "/attendance", label: "Điểm danh", icon: CalendarCheck },
      { to: "/reports", label: "Sổ liên lạc", icon: Bell },
      { to: "/health", label: "Sức khỏe", icon: HeartPulse },
    ],
  },
  {
    group: "Tài chính & nội dung",
    items: [
      { to: "/tuition", label: "Học phí", icon: Receipt },
      { to: "/announcements", label: "Thông báo", icon: Megaphone },
      { to: "/audit-logs", label: "Nhật ký", icon: Activity },
    ],
  },
  {
    group: "Cấu hình",
    items: [{ to: "/settings", label: "Cài đặt trường", icon: Settings }],
  },
];

const MOBILE_PRIMARY = [
  { to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true },
  { to: "/classrooms", label: "Lớp", icon: BookOpen },
  { to: "/students", label: "Học sinh", icon: Users },
  { to: "/tuition", label: "Học phí", icon: Receipt },
];

export function AppLayout() {
  const navigate = useNavigate();
  const [moreOpen, setMoreOpen] = useState(false);

  async function onLogout() {
    setMoreOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex">
      <aside className="sidebar hidden md:block">
        <div className="flex items-center gap-2 px-2 mb-5">
          <div className="w-8 h-8 rounded-lg brand-grad grid place-items-center text-white font-bold">
            K
          </div>
          <div>
            <div className="font-bold text-sm">KimThanh Kids</div>
            <div className="text-xs text-slate-400">School CRM</div>
          </div>
        </div>

        {NAV.map((sec, i) => (
          <div key={i}>
            {sec.group && <div className="nav-group">{sec.group}</div>}
            {sec.items.map((it) => (
              <NavLink
                key={it.to}
                to={it.to}
                end={"end" in it ? it.end : false}
                className={({ isActive }) => cn("nav-item", isActive && "active")}
              >
                <it.icon className="w-4 h-4" />
                {it.label}
              </NavLink>
            ))}
          </div>
        ))}

        <button onClick={onLogout} className="nav-item w-full text-left">
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </aside>

      <div className="flex-1 min-w-0 min-h-screen bg-[#F1F5F9] pb-16 md:pb-0">
        <Outlet />
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex bg-white border-t border-[#f4e7e0]">
        {MOBILE_PRIMARY.map((it) => (
          <NavLink
            key={it.to}
            to={it.to}
            end={it.end ?? false}
            className={({ isActive }) =>
              cn(
                "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
                isActive ? "text-[color:var(--primary-600)]" : "text-slate-500",
              )
            }
          >
            <it.icon className="w-5 h-5" />
            {it.label}
          </NavLink>
        ))}
        <button
          onClick={() => setMoreOpen(true)}
          className={cn(
            "flex-1 flex flex-col items-center justify-center gap-0.5 py-2 text-[10px] font-medium",
            moreOpen ? "text-[color:var(--primary-600)]" : "text-slate-500",
          )}
        >
          <MoreHorizontal className="w-5 h-5" />
          Thêm
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-6 max-h-[75vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">Điều hướng</div>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            {NAV.map((sec, i) => (
              <div key={i}>
                {sec.group && <div className="nav-group">{sec.group}</div>}
                {sec.items.map((it) => (
                  <NavLink
                    key={it.to}
                    to={it.to}
                    end={"end" in it ? it.end : false}
                    onClick={() => setMoreOpen(false)}
                    className={({ isActive }) => cn("nav-item", isActive && "active")}
                  >
                    <it.icon className="w-4 h-4" />
                    {it.label}
                  </NavLink>
                ))}
              </div>
            ))}
            <button
              onClick={onLogout}
              className="nav-item w-full text-left mt-2 border-t border-slate-100 pt-3"
            >
              <LogOut className="w-4 h-4" />
              Đăng xuất
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

