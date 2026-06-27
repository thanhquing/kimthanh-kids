import { ChevronRight, type LucideIcon } from "lucide-react";
import { NavLink } from "react-router-dom";
import { cn } from "@/lib/utils";

type Tone = "blue" | "orange" | "green" | "red" | "amber";

export function QuickAction({
  icon: Icon,
  label,
  to,
  tone,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  tone: Tone;
}) {
  const toneClass = {
    blue: "bg-blue-50 text-blue-600",
    orange: "bg-orange-50 text-orange-600",
    green: "bg-green-50 text-green-600",
    red: "bg-red-50 text-red-600",
    amber: "bg-amber-50 text-amber-600",
  }[tone];

  return (
    <NavLink to={to} className="card min-w-0 p-3 text-center">
      <div className={cn("mx-auto mb-1 grid h-10 w-10 place-items-center rounded-xl", toneClass)}>
        <Icon className="h-5 w-5" />
      </div>
      <div className="text-xs font-semibold leading-tight">{label}</div>
    </NavLink>
  );
}

export function Avatar({
  initials,
  image,
  size,
}: {
  initials: string;
  image?: string;
  size: "sm" | "md" | "lg" | "xl";
}) {
  const sizeClass = {
    sm: "!h-9 !w-9 text-xs",
    md: "!h-10 !w-10",
    lg: "!h-12 !w-12",
    xl: "!h-24 !w-24 text-2xl",
  }[size];

  if (image) return <img src={image} alt="" className={cn("avatar object-cover", sizeClass)} />;
  return <div className={cn("avatar", sizeClass)}>{initials}</div>;
}

export function StatusBadge({ status }: { status: string }) {
  const cls =
    status.includes("Quá") || status.includes("Vắng")
      ? "b-red"
      : status.includes("Chờ") || status.includes("Muộn") || status.includes("Chưa")
        ? "b-amber"
        : status.includes("Đã cho")
          ? "b-blue"
          : "b-green";

  return <span className={cn("badge", cls)}>{status}</span>;
}

export function Kpi({ num, label }: { num: string; label: string }) {
  return (
    <div className="card p-3 text-center">
      <div className="text-xl font-bold">{num}</div>
      <div className="text-[11px] font-medium text-slate-500">{label}</div>
    </div>
  );
}

export function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start gap-3 text-sm">
      <div className="w-20 shrink-0 text-xs font-semibold uppercase text-slate-500">{label}</div>
      <div className="flex-1">{value}</div>
    </div>
  );
}

export function ReportLine({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <b className="text-xs uppercase text-slate-500">{label}:</b> {value}
    </div>
  );
}

export function ScheduleRow({
  label,
  title,
  sub,
  color,
}: {
  label: string;
  title: string;
  sub: string;
  color: string;
}) {
  return (
    <div className="flex items-start gap-3 border-t border-slate-100 py-2">
      <div className={cn("w-14 text-xs font-semibold", color)}>{label}</div>
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
    </div>
  );
}

export function TaskCard({
  icon: Icon,
  title,
  sub,
  to,
  tone,
}: {
  icon: LucideIcon;
  title: string;
  sub: string;
  to: string;
  tone: "amber" | "blue";
}) {
  return (
    <NavLink to={to} className="card mb-2 flex w-full items-center gap-3 p-3 text-left">
      <Icon className={cn("h-5 w-5", tone === "amber" ? "text-amber-500" : "text-blue-500")} />
      <div className="flex-1">
        <div className="text-sm font-semibold">{title}</div>
        <div className="text-xs text-slate-500">{sub}</div>
      </div>
      <ChevronRight className="h-4 w-4 text-slate-300" />
    </NavLink>
  );
}

export function ProfileRow({
  icon: Icon,
  label,
  value,
  to,
}: {
  icon: LucideIcon;
  label: string;
  value?: string;
  to?: string;
}) {
  const content = (
    <>
      <Icon className="h-4 w-4 text-slate-400" />
      <div className="text-sm">{label}</div>
      {value ? (
        <div className="ml-auto text-sm font-medium">{value}</div>
      ) : (
        <ChevronRight className="ml-auto h-4 w-4 text-slate-400" />
      )}
    </>
  );

  if (to) {
    return (
      <NavLink to={to} className="flex w-full items-center gap-3 p-3 text-left">
        {content}
      </NavLink>
    );
  }

  return <div className="flex w-full items-center gap-3 p-3 text-left">{content}</div>;
}

