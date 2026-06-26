import type { ReactNode } from "react";

export function PageHeader({
  title,
  section = "CRM",
  children,
}: {
  title: string;
  section?: string;
  children?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="flex-1 min-w-0">
        <div className="text-xs text-slate-400">{section}</div>
        <div className="font-bold text-slate-800 truncate">{title}</div>
      </div>
      {children}
    </header>
  );
}
