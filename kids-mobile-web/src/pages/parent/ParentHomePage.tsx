import { Calendar, Pill, Receipt, Soup } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useAnnouncements } from "@/api/announcements";
import { useMe } from "@/api/auth";
import { useMyChildren } from "@/api/students";
import { invoiceRemaining, useMyInvoices } from "@/api/tuition";
import { GreetingHeader } from "@/components/mobile/MobileShell";
import { Avatar, QuickAction } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { announcementAudienceLabel } from "@/lib/announcementDisplay";
import { formatShortDate } from "@/lib/date";
import { initialsFromName } from "@/lib/studentDisplay";
import { isDueStatus } from "@/lib/tuitionDisplay";
import { formatVnd } from "@/lib/utils";

export function ParentHomePage() {
  const { t, lang } = useT();
  const { data: profile } = useMe();
  const { data: children = [] } = useMyChildren();
  const { data: announcements = [] } = useAnnouncements("parent");
  const { data: invoices = [] } = useMyInvoices();

  const name = profile?.fullName ?? "—";
  const dueInvoices = invoices.filter((inv) => isDueStatus(inv.status));
  const dueTotal = dueInvoices.reduce((sum, inv) => sum + invoiceRemaining(inv), 0);

  return (
    <>
      <GreetingHeader greeting={t("home.greetingParent")} name={name} initials={initialsFromName(name)} />
      <div className="card brand-grad mt-4 p-4 text-white">
        <div className="mt-1 text-xl font-bold">
          {children.length > 0 ? t("home.childrenAtSchool", { count: children.length }) : t("home.noChildren")}
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <QuickAction icon={Receipt} label={t("home.quickPayment")} to="/parent/invoices" tone="red" />
        <QuickAction icon={Pill} label={t("home.quickMedicine")} to="/parent/medicine" tone="green" />
        <QuickAction icon={Soup} label={t("home.quickMenu")} to="/parent/menu" tone="orange" />
        <QuickAction icon={Calendar} label={t("home.quickLeave")} to="/parent/leave" tone="blue" />
      </div>

      <div className="section-title">{t("home.myChildren")}</div>
      {children.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("home.noChildren")}</div>
      ) : (
        <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
          {children.slice(0, 5).map((student) => (
            <NavLink key={student.id} to={`/parent/student/${student.id}`} className="card min-w-[150px] p-3 text-left">
              <Avatar initials={initialsFromName(student.fullName)} image={student.avatarUrl ?? undefined} size="xl" />
              <div className="mt-2 text-sm font-semibold">{student.fullName}</div>
              <div className="text-xs text-slate-500">{student.classroom?.name ?? t("students.noClass")}</div>
            </NavLink>
          ))}
        </div>
      )}

      <div className="section-title">{t("home.recentAnnouncements")}</div>
      {announcements.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("home.noAnnouncements")}</div>
      ) : (
        <div className="space-y-2">
          {announcements.slice(0, 2).map((announcement) => (
            <NavLink key={announcement.id} to="/parent/announcements" className="card block p-3 text-left">
              <div className="flex items-start gap-3">
                <span className="badge b-peach">{announcementAudienceLabel(announcement.audience, t)}</span>
                <span className="ml-auto text-xs text-slate-400">
                  {formatShortDate(announcement.publishedAt ?? announcement.createdAt, lang)}
                </span>
              </div>
              <div className="mt-1 text-sm font-semibold">{announcement.title}</div>
            </NavLink>
          ))}
        </div>
      )}

      {dueInvoices.length > 0 ? (
        <NavLink to="/parent/invoices" className="card mt-3 flex items-center gap-3 p-3 text-left">
          <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600">
            <Receipt className="h-5 w-5" />
          </div>
          <div className="flex-1">
            <div className="text-sm font-semibold">{t("home.invoicesDue", { count: dueInvoices.length })}</div>
            <div className="text-xs text-slate-500">{t("home.invoicesDueTotal", { amount: formatVnd(dueTotal) })}</div>
          </div>
        </NavLink>
      ) : null}
    </>
  );
}
