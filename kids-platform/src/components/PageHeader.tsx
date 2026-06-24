import type { ReactNode } from "react";

export function PageHeader({
  title,
  section = "Platform",
  children,
}: {
  title: string;
  section?: string;
  children?: ReactNode;
}) {
  return (
    <header className="topbar">
      <div className="flex-1">
        <div className="text-xs text-slate-400">{section}</div>
        <div className="font-bold text-slate-800">{title}</div>
      </div>
      {children}
      <div className="flex items-center gap-2">
        <div className="avatar !w-8 !h-8 text-xs">SA</div>
        <div className="text-sm">
          <div className="font-semibold leading-tight">Super Admin</div>
          <div className="text-xs text-slate-400 leading-tight">Nền tảng</div>
        </div>
      </div>
    </header>
  );
}
