import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck,
  CalendarDays,
  ClipboardList,
  ClipboardCheck,
  ContactRound,
  HeartPulse,
  Images,
  Inbox,
  LayoutDashboard,
  LogOut,
  Megaphone,
  MoreHorizontal,
  Receipt,
  Settings,
  Utensils,
  Users,
  X,
} from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { logout, me } from "@/api/auth";
import { crm, type TenantRole } from "@/api/crm";
import logoFull from "@/assets/logo-kimthanh.png";
import { useT, type TKey, type Translator } from "@/i18n";
import { languageStore, type Language } from "@/lib/language";
import { ADMIN_ROLES, LESSON_EDITOR_ROLES, NON_FINANCE_ROLES, hasAnyRole } from "@/lib/roles";
import { cn } from "@/lib/utils";

// `roles`: chỉ hiện mục nav khi user có ≥1 role trong danh sách (khớp @Roles BE của endpoint
// chính trang đó → tránh vào trang bị 403). Mục KHÔNG có `roles` = mọi staff (list = STAFF đủ role).
type NavItem = {
  to: string;
  labelKey: TKey;
  icon: typeof LayoutDashboard;
  end?: boolean;
  roles?: TenantRole[];
};

const NAV: { groupKey: TKey | null; items: NavItem[] }[] = [
  {
    groupKey: null,
    items: [
      { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, roles: ADMIN_ROLES },
    ],
  },
  {
    groupKey: "navGroups.profile",
    items: [
      { to: "/classrooms", labelKey: "nav.classrooms", icon: BookOpen },
      { to: "/students", labelKey: "nav.students", icon: Users },
      { to: "/members", labelKey: "nav.members", icon: ClipboardList, roles: ADMIN_ROLES },
    ],
  },
  {
    groupKey: "navGroups.operations",
    items: [
      { to: "/attendance", labelKey: "nav.attendance", icon: CalendarCheck },
      { to: "/reports", labelKey: "nav.reports", icon: Bell },
      { to: "/health", labelKey: "nav.health", icon: HeartPulse, roles: NON_FINANCE_ROLES },
      { to: "/leave", labelKey: "nav.leave", icon: CalendarDays },
      { to: "/pickup", labelKey: "nav.pickup", icon: ContactRound, roles: NON_FINANCE_ROLES },
    ],
  },
  {
    groupKey: "navGroups.financeContent",
    items: [
      { to: "/tuition", labelKey: "nav.tuition", icon: Receipt },
      { to: "/announcements", labelKey: "nav.announcements", icon: Megaphone },
      { to: "/notifications", labelKey: "nav.notifications", icon: Inbox },
      { to: "/audit-logs", labelKey: "nav.auditLogs", icon: Activity, roles: ADMIN_ROLES },
    ],
  },
  {
    groupKey: "navGroups.planningContent",
    items: [
      { to: "/assignments", labelKey: "nav.assignments", icon: ClipboardCheck },
      { to: "/menus", labelKey: "nav.menus", icon: Utensils },
      { to: "/albums", labelKey: "nav.albums", icon: Images },
      { to: "/lessons", labelKey: "nav.lessons", icon: BookOpen, roles: LESSON_EDITOR_ROLES },
    ],
  },
  {
    groupKey: "navGroups.config",
    items: [{ to: "/settings", labelKey: "nav.settings", icon: Settings, roles: ADMIN_ROLES }],
  },
];

const MOBILE_PRIMARY: NavItem[] = [
  { to: "/", labelKey: "nav.dashboard", icon: LayoutDashboard, end: true, roles: ADMIN_ROLES },
  { to: "/classrooms", labelKey: "nav.classroomsShort", icon: BookOpen },
  { to: "/students", labelKey: "nav.students", icon: Users },
  { to: "/tuition", labelKey: "nav.tuition", icon: Receipt },
];

/** Mục hiện khi không giới hạn role HOẶC user có ≥1 role khớp. */
function canSee(item: NavItem, roles: TenantRole[]): boolean {
  return hasAnyRole(roles, item.roles);
}

function NavSections({ roles, onNavigate }: { roles: TenantRole[]; onNavigate?: () => void }) {
  const { t } = useT();
  return (
    <>
      {NAV.map((sec, i) => {
        const items = sec.items.filter((it) => canSee(it, roles));
        if (!items.length) return null; // ẩn cả group khi mọi mục bị lọc
        return (
          <div key={i}>
            {sec.groupKey && <div className="nav-group">{t(sec.groupKey)}</div>}
            {items.map((it) => (
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
        );
      })}
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

function NotificationBell({ label, onClick }: { label: string; onClick: () => void }) {
  const count = useQuery({ queryKey: ["notification-count"], queryFn: () => crm.notifications.unreadCount() });
  const n = count.data?.count ?? 0;
  return (
    <button
      type="button"
      aria-label={label}
      title={label}
      onClick={onClick}
      className="relative shrink-0 rounded-lg border border-[#f4e7e0] p-2 text-slate-500 transition hover:bg-[#fff3ec]"
    >
      <Bell className="h-4 w-4" />
      {n > 0 && (
        <span className="absolute -right-1 -top-1 grid h-4 min-w-4 place-items-center rounded-full bg-red-500 px-1 text-[10px] font-semibold text-white">
          {Math.min(n, 9)}
        </span>
      )}
    </button>
  );
}

function AccountPanel({
  t,
  lang,
  onLogout,
  onNotifications,
}: {
  t: Translator;
  lang: Language;
  onLogout: () => void;
  onNotifications: () => void;
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
        <NotificationBell label={t("topbar.notifications")} onClick={onNotifications} />
      </div>
    </div>
  );
}

export function AppLayout() {
  const navigate = useNavigate();
  const { t, lang } = useT();
  const [moreOpen, setMoreOpen] = useState(false);
  // Role của user hiện tại (để ẩn nav ngoài quyền). Chưa tải xong → [] (ẩn mục hạn chế
  // tới khi biết role, tránh nháy mục không được phép).
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  const roles = (meQuery.data?.roles ?? []) as TenantRole[];
  const mobilePrimary = MOBILE_PRIMARY.filter((it) => canSee(it, roles));

  async function onLogout() {
    setMoreOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className="flex">
      <aside className="sidebar hidden md:flex md:flex-col">
        <div className="px-2 mb-4">
          <img src={logoFull} alt="KimThanh Kids" className="h-10 w-auto max-w-[160px]" />
          <div>
            <div className="mt-1 text-xs text-slate-400">{t("brand.crm")}</div>
          </div>
        </div>

        <div className="mb-3 border-b border-[#f4e7e0] pb-4">
          <AccountPanel t={t} lang={lang} onLogout={onLogout} onNotifications={() => navigate("/notifications")} />
        </div>

        <nav className="flex-1 overflow-y-auto">
          <NavSections roles={roles} />
        </nav>
      </aside>

      <div className="flex-1 min-w-0 min-h-screen bg-[#F1F5F9] pb-16 md:pb-0">
        <Outlet />
      </div>

      <nav className="md:hidden fixed bottom-0 inset-x-0 z-30 flex bg-white border-t border-[#f4e7e0]">
        {mobilePrimary.map((it) => (
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
              <AccountPanel t={t} lang={lang} onLogout={onLogout} onNotifications={() => { setMoreOpen(false); navigate("/notifications"); }} />
            </div>
            <NavSections roles={roles} onNavigate={() => setMoreOpen(false)} />
          </div>
        </div>
      )}
    </div>
  );
}
