import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2, CircleCheck, Lock, Receipt, Search, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { badgeFor, TENANT_STATUS, TIER_LABEL } from "@/lib/labels";

// Màu lát donut "Phân bổ theo gói" (theo thứ tự count giảm dần) — palette khớp mock-ui.
const SLICE_COLORS = ["#F89A5B", "#F26B5E", "#7BC796", "#FFD27A", "#8b6f68"];

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

/** VND → "168.4" (đơn vị "tr" render riêng để giữ style mock). */
function mrrMillions(v: number): string {
  return (v / 1_000_000).toFixed(1);
}

/** Chuỗi MRR → toạ độ polyline trong viewBox 0 0 600 200. */
function linePoints(values: number[]): string {
  if (values.length === 0) return "";
  const max = Math.max(...values, 1);
  const n = values.length;
  return values
    .map((v, i) => {
      const x = n === 1 ? 0 : (i / (n - 1)) * 600;
      const y = 192 - (v / max) * 160;
      return `${Math.round(x)},${Math.round(y)}`;
    })
    .join(" ");
}

export function DashboardPage() {
  const { data, isLoading } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => platform.overview(),
  });

  const k = data?.kpis;
  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));

  const series = data?.mrrSeries ?? [];
  const line = linePoints(series.map((s) => s.value));
  const area = line ? `0,200 ${line} 600,200` : "";

  const dist = data?.planDistribution ?? [];
  const distTotal = dist.reduce((s, d) => s + d.count, 0);
  let acc = 0; // offset cộng dồn cho từng lát donut

  return (
    <>
      <PageHeader title="Tổng quan">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input className="field !pl-9 !py-1.5" placeholder="Tìm trường, hóa đơn..." />
        </div>
      </PageHeader>

      <main className="p-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi icon={Building2} tint="bg-blue-50 text-blue-600" num={n(k?.tenants)} label="Tổng số trường" />
          <Kpi icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" num={n(k?.activeTenants)} label="Đang hoạt động" />
          <Kpi icon={Sparkles} tint="bg-amber-50 text-amber-600" num={n(k?.trialTenants)} label="Đang dùng thử" />
          <Kpi icon={AlertCircle} tint="bg-red-50 text-red-600" num={n(k?.overdueInvoices)} label="Quá hạn" />
          <Kpi icon={Lock} tint="bg-slate-100 text-slate-500" num={n(k?.suspendedTenants)} label="Tạm khóa" />
          <Kpi
            icon={TrendingUp}
            tint="bg-pink-50 text-pink-600"
            num={
              isLoading ? (
                "…"
              ) : (
                <>
                  {mrrMillions(k?.mrr ?? 0)}
                  <span className="text-base font-semibold">tr</span>
                </>
              )
            }
            label="MRR (đ/tháng)"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Doanh thu định kỳ (MRR · 12 tháng)</div>
              {data?.mrrGrowthPct != null && (
                <span className={`badge ${data.mrrGrowthPct >= 0 ? "b-green" : "b-red"}`}>
                  {data.mrrGrowthPct >= 0 ? "+" : ""}
                  {data.mrrGrowthPct}%
                </span>
              )}
            </div>
            <svg viewBox="0 0 600 200" className="w-full h-48" preserveAspectRatio="none">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F26B5E" stopOpacity=".4" />
                  <stop offset="100%" stopColor="#F26B5E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {area && <polyline fill="url(#g1)" stroke="none" points={area} />}
              {line && <polyline fill="none" stroke="#F26B5E" strokeWidth="3" points={line} />}
            </svg>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {series.map((s, i) => (
                <span key={`${s.month}-${i}`}>{s.month}</span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3">Phân bổ theo gói</div>
            <div className="flex justify-center my-2">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                  {dist.map((d, i) => {
                    const pct = distTotal ? (d.count / distTotal) * 100 : 0;
                    const dash = `${pct} ${100 - pct}`;
                    const offset = -acc;
                    acc += pct;
                    return (
                      <circle
                        key={d.tier}
                        cx="18"
                        cy="18"
                        r="15.9"
                        fill="none"
                        stroke={SLICE_COLORS[i % SLICE_COLORS.length]}
                        strokeWidth="4"
                        strokeDasharray={dash}
                        strokeDashoffset={offset}
                      />
                    );
                  })}
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{distTotal}</div>
                    <div className="text-xs text-slate-400">Trường</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-1 mt-3">
              {dist.length === 0 && !isLoading && (
                <div className="text-muted py-2">Chưa có thuê bao.</div>
              )}
              {dist.map((d, i) => (
                <div key={d.tier} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="status-dot"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    {TIER_LABEL[d.tier] ?? d.tier}
                  </span>
                  <b>{d.count}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Trường mới đăng ký</div>
              <Link to="/tenants" className="text-xs text-[color:var(--primary)] font-semibold">
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.recentTenants ?? []).map((t) => {
                const b = badgeFor(TENANT_STATUS, t.status);
                return (
                  <div key={t.id} className="py-2.5 flex items-center gap-3">
                    <div className="avatar !w-8 !h-8 text-xs">
                      {t.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{t.displayName}</div>
                      <div className="text-xs text-slate-400">
                        {t.slug}
                        {t.planName ? ` · gói ${t.planName}` : ""}
                      </div>
                    </div>
                    <span className={`badge ${b.badge}`}>{b.label}</span>
                  </div>
                );
              })}
              {!isLoading && (data?.recentTenants ?? []).length === 0 && (
                <div className="py-2 text-muted text-sm">Chưa có trường nào.</div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Cần chú ý — hóa đơn quá hạn</div>
              <Link to="/invoices" className="text-xs text-[color:var(--primary)] font-semibold">
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.recentOverdue ?? []).map((inv) => (
                <div key={inv.id} className="py-2.5 flex items-center gap-3">
                  <Receipt className="w-4 h-4 text-red-500" />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">
                      {inv.invoiceNumber}
                      {inv.tenantName ? ` · ${inv.tenantName}` : ""}
                    </div>
                    <div className="text-xs text-slate-400">
                      {inv.amountDue.toLocaleString("vi-VN")}đ · trễ {inv.daysLate ?? 0} ngày
                    </div>
                  </div>
                  <span className="badge b-red">Quá hạn</span>
                </div>
              ))}
              {!isLoading && (data?.recentOverdue ?? []).length === 0 && (
                <div className="py-2 text-muted text-sm">Không có hóa đơn quá hạn.</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
