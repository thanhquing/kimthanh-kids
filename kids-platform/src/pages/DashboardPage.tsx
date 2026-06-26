import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Building2, CircleCheck, Lock, Receipt, Search, Sparkles, TrendingUp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { Link, useNavigate } from "react-router-dom";
import { platform, type RevenuePoint } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { useT } from "@/i18n";
import { badgeFor, INVOICE_STATUS, TENANT_STATUS, tierLabel } from "@/lib/labels";

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

/** Ô tìm nhanh: trường + hóa đơn (debounce 300ms) → bấm item điều hướng đúng trang. */
function QuickSearch() {
  const navigate = useNavigate();
  const { t } = useT();
  const [q, setQ] = useState("");
  const [debounced, setDebounced] = useState("");
  const [open, setOpen] = useState(false);
  const boxRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(q.trim()), 300);
    return () => clearTimeout(t);
  }, [q]);
  useEffect(() => {
    const h = (e: MouseEvent) => {
      if (boxRef.current && !boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const { data } = useQuery({
    queryKey: ["quick-search", debounced],
    queryFn: () => platform.search(debounced),
    enabled: debounced.length >= 1,
  });

  const go = (path: string) => {
    setOpen(false);
    setQ("");
    navigate(path);
  };
  const tenants = data?.tenants ?? [];
  const invoices = data?.invoices ?? [];
  const empty = debounced.length >= 1 && tenants.length + invoices.length === 0;

  return (
    <div ref={boxRef} className="relative w-72">
      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
      <input
        className="field !pl-9 !py-1.5"
        placeholder={t("dash.searchPlaceholder")}
        value={q}
        onChange={(e) => {
          setQ(e.target.value);
          setOpen(true);
        }}
        onFocus={() => setOpen(true)}
      />
      {open && debounced.length >= 1 && (
        <div className="absolute right-0 z-30 mt-1 w-80 max-h-96 overflow-y-auto rounded-xl border border-slate-100 bg-white py-1 shadow-lg">
          {empty && <div className="px-3 py-3 text-sm text-muted">{t("dash.searchEmpty")}</div>}
          {tenants.length > 0 && <div className="nav-group !mt-1">{t("dash.searchTenants")}</div>}
          {tenants.map((t) => (
            <button
              key={t.id}
              onClick={() => go(`/tenants/${t.id}`)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fff8f3]"
            >
              <Building2 className="w-4 h-4 text-slate-400" />
              <span className="flex-1 truncate text-sm font-medium">{t.name}</span>
              <span className="text-xs text-slate-400">{t.slug}</span>
            </button>
          ))}
          {invoices.length > 0 && <div className="nav-group">{t("dash.searchInvoices")}</div>}
          {invoices.map((i) => (
            <button
              key={i.id}
              onClick={() => go(`/invoices/${i.id}`)}
              className="flex w-full items-center gap-2 px-3 py-2 text-left hover:bg-[#fff8f3]"
            >
              <Receipt className="w-4 h-4 text-slate-400" />
              <span className="flex-1 truncate font-mono text-xs">{i.invoiceNumber}</span>
              <span className="truncate text-xs text-slate-400">{i.tenantName ?? ""}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
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
  const { t, lang } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["platform-overview"],
    queryFn: () => platform.overview(),
  });

  // Toggle 12/24 tháng: 12 tháng dùng luôn dữ liệu overview; 24 tháng gọi /platform/revenue.
  const [range, setRange] = useState<12 | 24>(12);
  const { data: rev } = useQuery({
    queryKey: ["platform-revenue", range],
    queryFn: () => platform.revenue(range),
    enabled: range === 24,
  });

  const k = data?.kpis;
  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));

  const series: RevenuePoint[] = range === 24 ? (rev?.series ?? []) : (data?.mrrSeries ?? []);
  const growth = range === 24 ? (rev?.growthPct ?? 0) : (data?.mrrGrowthPct ?? 0);
  const line = linePoints(series.map((s) => s.value));
  const area = line ? `0,200 ${line} 600,200` : "";
  const label = (p: RevenuePoint) => (range === 24 ? `${p.month}/${p.period.slice(2, 4)}` : p.month);

  const dist = data?.planDistribution ?? [];
  const distTotal = dist.reduce((s, d) => s + d.count, 0);
  let acc = 0; // offset cộng dồn cho từng lát donut

  return (
    <>
      <PageHeader title={t("dash.title")}>
        <QuickSearch />
      </PageHeader>

      <main className="p-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi icon={Building2} tint="bg-blue-50 text-blue-600" num={n(k?.tenants)} label={t("dash.kpiTenants")} />
          <Kpi icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" num={n(k?.activeTenants)} label={t("dash.kpiActive")} />
          <Kpi icon={Sparkles} tint="bg-amber-50 text-amber-600" num={n(k?.trialTenants)} label={t("dash.kpiTrial")} />
          <Kpi icon={AlertCircle} tint="bg-red-50 text-red-600" num={n(k?.overdueInvoices)} label={t("dash.kpiOverdue")} />
          <Kpi icon={Lock} tint="bg-slate-100 text-slate-500" num={n(k?.suspendedTenants)} label={t("dash.kpiSuspended")} />
          <Kpi
            icon={TrendingUp}
            tint="bg-pink-50 text-pink-600"
            num={
              isLoading ? (
                "…"
              ) : (
                <>
                  {mrrMillions(k?.mrr ?? 0)}
                  <span className="text-base font-semibold">{t("dash.millionsUnit")}</span>
                </>
              )
            }
            label={t("dash.kpiMrr")}
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">{t("dash.mrrTitle", { range })}</div>
              <div className="flex items-center gap-2">
                <div className="flex rounded-lg border border-[#f1e3dc] overflow-hidden text-xs font-medium">
                  {([12, 24] as const).map((r) => (
                    <button
                      key={r}
                      onClick={() => setRange(r)}
                      className={
                        r === range
                          ? "px-2.5 py-1 bg-[color:var(--primary)] text-white"
                          : "px-2.5 py-1 text-slate-500 hover:bg-[#fff3ec]"
                      }
                    >
                      {r}
                      {t("dash.monthsShort")}
                    </button>
                  ))}
                </div>
                <span className={`badge ${growth >= 0 ? "b-green" : "b-red"}`}>
                  {growth >= 0 ? "+" : ""}
                  {growth}%
                </span>
              </div>
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
                // 24 tháng: chỉ hiện nhãn cách 1 tháng (offset 2) để khỏi chồng chữ; vẫn giữ chỗ để thẳng cột.
                <span key={`${s.period}-${i}`} className="text-center">
                  {range === 24 && i % 2 !== 0 ? "" : label(s)}
                </span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3">{t("dash.planDist")}</div>
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
                    <div className="text-xs text-slate-400">{t("dash.tenantsUnit")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-1 mt-3">
              {dist.length === 0 && !isLoading && (
                <div className="text-muted py-2">{t("dash.noSubs")}</div>
              )}
              {dist.map((d, i) => (
                <div key={d.tier} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span
                      className="status-dot"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    {tierLabel(d.tier)}
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
              <div className="font-bold">{t("dash.recentTenants")}</div>
              <Link to="/tenants" className="text-xs text-[color:var(--primary)] font-semibold">
                {t("common.viewAll")}
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {(data?.recentTenants ?? []).map((rt) => {
                const b = badgeFor(TENANT_STATUS, rt.status);
                return (
                  <div key={rt.id} className="py-2.5 flex items-center gap-3">
                    <div className="avatar !w-8 !h-8 text-xs">
                      {rt.displayName.slice(0, 2).toUpperCase()}
                    </div>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{rt.displayName}</div>
                      <div className="text-xs text-slate-400">
                        {rt.slug}
                        {rt.planName ? t("dash.planSuffix", { name: rt.planName }) : ""}
                      </div>
                    </div>
                    <span className={`badge ${b.badge}`}>{b.label}</span>
                  </div>
                );
              })}
              {!isLoading && (data?.recentTenants ?? []).length === 0 && (
                <div className="py-2 text-muted text-sm">{t("dash.noTenants")}</div>
              )}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">{t("dash.overdueTitle")}</div>
              <Link to="/invoices" className="text-xs text-[color:var(--primary)] font-semibold">
                {t("common.viewAll")}
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
                      {t("dash.overdueMeta", {
                        amount: inv.amountDue.toLocaleString(lang === "en" ? "en-US" : "vi-VN"),
                        days: inv.daysLate ?? 0,
                      })}
                    </div>
                  </div>
                  <span className="badge b-red">{badgeFor(INVOICE_STATUS, "OVERDUE").label}</span>
                </div>
              ))}
              {!isLoading && (data?.recentOverdue ?? []).length === 0 && (
                <div className="py-2 text-muted text-sm">{t("dash.noOverdue")}</div>
              )}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
