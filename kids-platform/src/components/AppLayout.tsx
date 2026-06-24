import {
  Building2,
  LayoutDashboard,
  LogOut,
  Package,
  Receipt,
  Repeat,
  TicketPercent,
} from "lucide-react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout } from "@/api/auth";
import { cn } from "@/lib/utils";

const NAV = [
  { group: null, items: [{ to: "/", label: "Tổng quan", icon: LayoutDashboard, end: true }] },
  {
    group: "Khách hàng",
    items: [
      { to: "/tenants", label: "Trường thuê", icon: Building2 },
      { to: "/subscriptions", label: "Thuê bao", icon: Repeat },
    ],
  },
  {
    group: "Doanh thu",
    items: [
      { to: "/invoices", label: "Hóa đơn nền tảng", icon: Receipt },
      { to: "/coupons", label: "Mã giảm giá", icon: TicketPercent },
    ],
  },
  { group: "Cấu hình", items: [{ to: "/plans", label: "Gói dịch vụ", icon: Package }] },
];

export function AppLayout() {
  const navigate = useNavigate();
  async function onLogout() {
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex">
      <aside className="sidebar">
        <div className="flex items-center gap-2 px-2 mb-5">
          <div className="w-8 h-8 rounded-lg brand-grad grid place-items-center text-white font-bold">
            K
          </div>
          <div>
            <div className="font-bold text-sm">KimThanh Kids</div>
            <div className="text-xs text-slate-400">Platform Console</div>
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

        <button onClick={onLogout} className="nav-item mt-2 w-full text-left">
          <LogOut className="w-4 h-4" />
          Đăng xuất
        </button>
      </aside>

      <div className="flex-1 min-h-screen bg-[#F1F5F9]">
        <Outlet />
      </div>
    </div>
  );
}
