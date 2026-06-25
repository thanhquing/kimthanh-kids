import { useQuery } from "@tanstack/react-query";
import { Activity, Building2, CircleCheck, Search, Users, Zap } from "lucide-react";
import { useEffect, useState, type ReactNode } from "react";
import { Link } from "react-router-dom";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { actionLabel, eventLabel, formatDateTime } from "@/lib/labels";

function Kpi({
  icon: Icon,
  tint,
  num,
  label,
}: {
  icon: typeof Building2;
  tint: string;
  num: ReactNode;
  label: string;
}) {
  return (
    <div className="kpi">
      <div className={`w-9 h-9 rounded-xl grid place-items-center ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export function ObservabilityPage() {
  const { data: usage, isLoading } = useQuery({
    queryKey: ["usage-overview"],
    queryFn: () => platform.usageOverview(),
  });

  // Lọc nhật ký theo action (debounce 350ms) + phân trang.
  const [actionInput, setActionInput] = useState("");
  const [action, setAction] = useState("");
  const [page, setPage] = useState(1);
  useEffect(() => {
    const t = setTimeout(() => {
      setAction(actionInput);
      setPage(1);
    }, 350);
    return () => clearTimeout(t);
  }, [actionInput]);

  const { data: audit, isLoading: auditLoading } = useQuery({
    queryKey: ["audit", page, action],
    queryFn: () => platform.listAudit(page, action || undefined),
  });

  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));
  const rows = audit?.items ?? [];
  const total = audit?.meta.total ?? 0;
  const pageSize = audit?.meta.pageSize ?? 30;
  const maxPage = Math.max(1, Math.ceil(total / pageSize));
  const topMax = Math.max(...(usage?.topEvents ?? []).map((e) => e.count), 1);

  return (
    <>
      <PageHeader title="Theo dõi vận hành" section="Vận hành" />

      <main className="p-6">
        {/* KPI hoạt động người dùng */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi icon={Activity} tint="bg-pink-50 text-pink-600" num={n(usage?.dau)} label="DAU (24 giờ)" />
          <Kpi icon={Activity} tint="bg-amber-50 text-amber-600" num={n(usage?.wau)} label="WAU (7 ngày)" />
          <Kpi icon={Activity} tint="bg-blue-50 text-blue-600" num={n(usage?.mau)} label="MAU (30 ngày)" />
          <Kpi icon={Users} tint="bg-violet-50 text-violet-600" num={n(usage?.users)} label="Tổng người dùng" />
          <Kpi icon={Building2} tint="bg-slate-100 text-slate-500" num={n(usage?.tenants)} label="Tổng số trường" />
          <Kpi icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" num={n(usage?.activeTenants)} label="Trường hoạt động" />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Nhật ký hệ thống */}
          <div className="card overflow-hidden lg:col-span-2">
            <div className="flex items-center justify-between gap-3 p-4 border-b border-slate-100">
              <div className="font-bold">Nhật ký hệ thống</div>
              <div className="relative w-64 max-w-full">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  className="field !pl-9 !py-1.5"
                  placeholder="Lọc theo hành động (vd: invoice)"
                  value={actionInput}
                  onChange={(e) => setActionInput(e.target.value)}
                />
              </div>
            </div>
            <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Thời gian</th>
                  <th>Trường</th>
                  <th>Người thực hiện</th>
                  <th>Hành động</th>
                  <th>Đối tượng</th>
                  <th>IP</th>
                </tr>
              </thead>
              <tbody>
                {auditLoading && <tr><td colSpan={6} className="!text-center text-muted">Đang tải…</td></tr>}
                {!auditLoading && rows.length === 0 && (
                  <tr><td colSpan={6} className="!text-center text-muted">Chưa có nhật ký.</td></tr>
                )}
                {rows.map((r) => (
                  <tr key={r.id} className="hover:bg-[#fff8f3]">
                    <td className="whitespace-nowrap text-slate-500">{formatDateTime(r.createdAt)}</td>
                    <td>{r.tenantName ?? <span className="text-slate-400">Nền tảng</span>}</td>
                    <td>
                      <div className="font-medium">{r.actorName ?? "—"}</div>
                      {r.actorEmail && <div className="text-xs text-slate-400">{r.actorEmail}</div>}
                    </td>
                    <td className="font-medium">{actionLabel(r.action)}</td>
                    <td className="text-slate-500">
                      {r.targetType ? (
                        <>
                          {r.targetType}
                          {r.targetId ? <span className="text-slate-400"> #{r.targetId.slice(0, 8)}</span> : null}
                        </>
                      ) : (
                        "—"
                      )}
                    </td>
                    <td className="text-xs text-slate-400 font-mono">{r.ip ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            </div>
            {total > pageSize && (
              <div className="flex items-center justify-between p-3 border-t border-slate-100 text-sm">
                <span className="text-slate-400">
                  {total} bản ghi · trang {page}/{maxPage}
                </span>
                <div className="flex gap-2">
                  <button
                    className="btn-soft text-sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Trước
                  </button>
                  <button
                    className="btn-soft text-sm"
                    disabled={page >= maxPage}
                    onClick={() => setPage((p) => Math.min(maxPage, p + 1))}
                  >
                    Sau
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Top sự kiện 30 ngày */}
          <div className="card p-5">
            <div className="flex items-center gap-2 font-bold mb-4">
              <Zap className="w-4 h-4 text-[color:var(--primary)]" />
              Top sự kiện (30 ngày)
            </div>
            <div className="space-y-3">
              {(usage?.topEvents ?? []).map((e) => (
                <div key={e.type}>
                  <div className="flex items-center justify-between text-sm mb-1">
                    <span>{eventLabel(e.type)}</span>
                    <b>{e.count}</b>
                  </div>
                  <div className="h-2 rounded-full bg-slate-100 overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[color:var(--primary)]"
                      style={{ width: `${(e.count / topMax) * 100}%` }}
                    />
                  </div>
                </div>
              ))}
              {!isLoading && (usage?.topEvents ?? []).length === 0 && (
                <div className="text-muted text-sm py-2">Chưa có sự kiện nào.</div>
              )}
            </div>
            <p className="text-xs text-slate-400 mt-4">
              "Active" = số người dùng riêng biệt có đăng nhập trong khoảng. Sự kiện được ghi từ
              backend (login/signup…); app trường sẽ bổ sung event khi build.{" "}
              <Link to="/tenants" className="text-[color:var(--primary)] font-semibold">
                Xem trường
              </Link>
            </p>
          </div>
        </div>
      </main>
    </>
  );
}
