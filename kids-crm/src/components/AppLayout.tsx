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
import { useT, type TKey, type Translator } from "@/i18n";
import { languageStore, type Language } from "@/lib/language";
import { cn } from "@/lib/utils";

type NavItem = { to: string; labelKey: TKey; icon: typeof LayoutDashboard; end?: boolean };

const NAV: { groupKey: TKey | null; items: NavItem[] }[] = [
  { groupKey: null, items: [{ to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true }] },
  {
    groupKey: "navGroups.profile",
    items: [
      { to: "/classrooms", labelKey: "nav.classrooms", icon: BookOpen },
      { to: "/students", labelKey: "nav.students", icon: Users },
      { to: "/members", labelKey: "nav.members", icon: ClipboardList },
    ],
  },
  {
    groupKey: "navGroups.operations",
    items: [
      { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
      { to: "/reports", labelKey: "nav.reports", icon: Bell },
      { to: "/health", labelKey: "nav.health", icon: HeartPulse },
    ],
  },
  {
    groupKey: "navGroups.financeContent",
    items: [
      { to: "/tuition", labelKey: "nav.tuition", icon: Receipt },
      { to: "/announcements", labelKey: "nav.announcements", icon: Megaphone },
      { to: "/audit-logs", labelKey: "nav.auditLogs", icon: Activity },
    ],
  },
  {
    groupKey: "navGroups.config",
    items: [{ to: "/settings", labelKey: "nav.settings", icon: Settings }],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true },
  { to: "/classrooms", labelKey: "nav.classroomsShort", icon: BookOpen },
  { to: "/students", labelKey: "nav.students", icon: Users },
  { to: "/tuition", labelKey: "nav.tuition", icon: Receipt },
];

function NavSections({ onNavigate }: { onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <>
      {NAV.map((sec, i) => (
        <div key={i}>
          {sec.groupKey && <div className="nav-group">{t(sec.groupKey)}</div>}
          {sec.items.map((it) => (
            <NavLink
              key={it.to}
              to={it.to}
              end={it.end ?? false}
              onClick={onNavigate}
              className={({ isActive }) => cn("nav-item", isActive && "active")}
            >
              <it.icon className="w-4 h-4" />
              {t(it.labelKey)}
            </NavLink>
          ))}
        </div>
      ))}
    </>
  );
}

function LanguageToggle({ lang, className }: { lang: Language; className?: string }) {
  return (
    <div className={cn("flex rounded-lg bg-[#fff3ec] p-0.5 text-xs font-semibold", className)}>
      {(["vi", "en"] as const).map((code) => (
        <button
          key={code}
          type="button"
          aria-pressed={lang === code}
          onClick={() => languageStore.set(code)}
          className={cn(
            "flex-1 rounded-md py-1 uppercase transition",
            lang === code
              ? "bg-white text-[color:var(--primary-600)] shadow-sm"
              : "text-slate-500 hover:text-slate-700",
          )}
        >
          {code}
        </button>
      ))}
    </div>
  );
}

function NotificationBell({ label }: { label: string }) {
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      className="relative shrink-0 rounded-lg border border-[#f4e7e0] p-2 text-slate-500 transition hover:bg-[#fff3ec]"
    >
      <Bell className="h-4 w-4" />
      <span className="absolute -right-1 -top-1 grid h-4 w-4 place-items-center rounded-full bg-red-500 text-[10px] font-semibold text-white">
        3
      </span>
    </button>
  );
}

function AccountPanel({
  t,
  lang,
  onLogout,
}: {
  t: Translator;
  lang: Language;
  onLogout: () => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2.5 rounded-xl border border-[#f4e7e0] bg-[#fffaf7] px-3 py-2.5">
        <div className="avatar !h-9 !w-9 shrink-0 text-xs">SA</div>
        <div className="min-w-0 flex-1">
          <div className="truncate text-sm font-semibold leading-tight text-slate-800">
            {t("topbar.adminName")}
          </div>
          <div className="truncate text-xs leading-tight text-slate-400">{t("topbar.adminRole")}</div>
        </div>
        <button
          type="button"
          onClick={onLogout}
          title={t("nav.logout")}
          aria-label={t("nav.logout")}
          className="shrink-0 rounded-lg p-1.5 text-slate-400 transition hover:bg-white hover:text-[color:var(--primary-600)]"
        >
          <LogOut className="h-4 w-4" />
        </button>
      </div>
      <div className="flex items-center gap-2">
        <LanguageToggle lang={lang} className="flex-1" />
        <NotificationBell label={t("topbar.notifications")} />
      </div>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const [moreOpen, setMoreOpen] = useState(false);

  async function onLogout() {
    setMoreOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex">
      <aside className="sidebar hidden md:flex md:flex-col">
        <div className="flex items-center gap-2 px-2 mb-4">
          <div className="w-8 h-8 rounded-lg brand-grad grid place-items-center text-white font-bold">
            K
          </div>
          <div>
            <div className="font-bold text-sm">{t("brand.name")}</div>
            <div className="text-xs text-slate-400">{t("brand.crm")}</div>
          </div>
        </div>

        <div className="mb-3 border-b border-[#f4e7e0] pb-4">
          <AccountPanel t={t} lang={lang} onLogout={onLogout} />
        </div>

        <nav className="flex-1 overflow-y-auto">
          <NavSections />
        </nav>
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
            {t(it.labelKey)}
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
          {t("nav.more")}
        </button>
      </nav>

      {moreOpen && (
        <div className="md:hidden fixed inset-0 z-40" onClick={() => setMoreOpen(false)}>
          <div className="absolute inset-0 bg-black/30" />
          <div
            className="absolute bottom-0 inset-x-0 bg-white rounded-t-2xl p-4 pb-6 max-h-[80vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-2">
              <div className="font-bold">{t("nav.navigation")}</div>
              <button onClick={() => setMoreOpen(false)} className="p-1 text-slate-400">
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="mb-3 border-b border-[#f4e7e0] pb-3">
              <AccountPanel t={t} lang={lang} onLogout={onLogout} />
            </div>
            <NavSections onNavigate={() => setMoreOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
