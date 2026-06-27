import {
  Bell,
  ChevronLeft,
  type LucideIcon,
} from "lucide-react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useMobileState } from "@/lib/mobileState";
import { cn } from "@/lib/utils";
import { parentTabs, roleBase, teacherTabs } from "@/lib/routes";
import type { ReactNode } from "react";

function isTabActive(pathname: string, tab: { to: string; match: string[] }) {
  if (tab.to === "/parent" || tab.to === "/teacher") return pathname === tab.to;
  return tab.match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

export function PhoneFrame({ children }: { children: ReactNode }) {
  return (
    <main className="stage flex min-h-screen flex-col items-center justify-start bg-[#F1F5F9] px-4 py-10">
      <div className="phone">{children}</div>
    </main>
  );
}

export function MobileLayout() {
  const { role } = useMobileState();
  const { pathname } = useLocation();
  const tabs = role === "teacher" ? teacherTabs : parentTabs;

  return (
    <>
      <div className="phone-body tap-highlight-none">
        <Outlet />
      </div>
      <div className="phone-tabbar">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <NavLink
              key={tab.to}
              to={tab.to}
              className={() => cn("tab", isTabActive(pathname, tab) && "active")}
            >
              <Icon className="h-5 w-5" />
              <span>{tab.label}</span>
            </NavLink>
          );
        })}
      </div>
    </>
  );
}

export function TopBar({
  title,
  rightIcon: RightIcon,
  onRight,
  backTo,
}: {
  title: string;
  rightIcon?: LucideIcon;
  onRight?: () => void;
  backTo?: string;
}) {
  const navigate = useNavigate();
  return (
    <>
      <div className="safe-top absolute left-0 right-0 top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white px-5 pb-3">
        {backTo ? (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            className="grid h-5 w-5 place-items-center"
            aria-label="Quay lại"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
        ) : (
          <div className="h-5 w-5" />
        )}
        <div className="text-sm font-semibold text-slate-800">{title}</div>
        <button
          type="button"
          onClick={onRight}
          className="grid h-5 w-5 place-items-center"
          aria-label="Tác vụ"
        >
          {RightIcon ? <RightIcon className="h-5 w-5" /> : null}
        </button>
      </div>
      <div className="h-14" />
    </>
  );
}

export function GreetingHeader({
  greeting,
  name,
  initials,
}: {
  greeting: string;
  name: string;
  initials: string;
}) {
  const { role } = useMobileState();
  const base = roleBase(role);

  return (
    <div className="flex items-center justify-between">
      <div>
        <div className="text-xs text-slate-500">{greeting}</div>
        <div className="text-lg font-bold">{name}</div>
      </div>
      <div className="flex items-center gap-2">
        <NavLink to={`${base}/notifications`} className="grid h-10 w-10 place-items-center rounded-full bg-slate-50">
          <Bell className="h-5 w-5 text-slate-500" />
        </NavLink>
        <div className="avatar !h-10 !w-10">{initials}</div>
      </div>
    </div>
  );
}
