import { useQuery } from "@tanstack/react-query";
import { AlertCircle, Baby, Pill, Receipt, School, Search, Users } from "lucide-react";
import type { ReactNode } from "react";
import { crm, type DashboardSummary } from "@/api/crm";
import { PageHeader } from "@/components/PageHeader";
import { useT, type TKey, type Translator } from "@/i18n";
import { formatVnd } from "@/lib/utils";

const AUDIENCE_BADGE: Record<string, string> = {
  ALL: "b-blue",
  CLASS: "b-peach",
  PARENTS: "b-green",
  TEACHERS: "b-slate",
};

const AUDIENCE_KEY: Record<string, TKey> = {
  ALL: "audience.ALL",
  CLASS: "audience.CLASS",
  PARENTS: "audience.PARENTS",
  TEACHERS: "audience.TEACHERS",
};

function audienceLabel(t: Translator, audience: string): string {
  const key = AUDIENCE_KEY[audience];
  return key ? t(key) : audience;
}

function Kpi({
  icon: Icon,
  tint,
  num,
  label,
}: {
  icon: typeof Baby;
  tint: string;
  num: ReactNode;
  label: string;
}) {
  return (
    <div className="kpi">
      <div className={`w-9 h-9 rounded-xl ${tint} grid place-items-center`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

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

function DashboardSearch() {
  const { t } = useT();
  return (
    <div className="hidden md:block relative w-72">
      <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
      <input className="field !pl-9 !py-1.5" placeholder={t("dashboard.searchPlaceholder")} />
    </div>
  );
}

function medicineValue(data: DashboardSummary | undefined, status: string): number {
  return data?.medicineThisMonth?.[status] ?? 0;
}

function dateAgo(t: Translator, iso?: string | null): string {
  if (!iso) return t("time.none");
  const diffMs = Date.now() - new Date(iso).getTime();
  const hours = Math.max(0, Math.floor(diffMs / 3_600_000));
  if (hours < 1) return t("time.justNow");
  if (hours < 24) return t("time.hoursAgo", { n: hours });
  return t("time.daysAgo", { n: Math.floor(hours / 24) });
}

export function DashboardPage() {
  const { t } = useT();
  const { data, isLoading } = useQuery({
    queryKey: ["crm-dashboard"],
    queryFn: () => crm.dashboard(),
  });
  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));

  const trend = data?.attendanceTrend30d ?? [];
  const line = linePoints(trend.map((p) => p.present));
  const area = line ? `0,200 ${line} 600,200` : "";
  const revenue = data?.revenueLast6Months ?? [];
  const maxRevenue = Math.max(...revenue.map((r) => r.amount), 1);
  const medicineTotal = data?.medicineTotalThisMonth ?? 0;
  const medPending = medicineValue(data, "PENDING");
  const medAdministered = medicineValue(data, "ADMINISTERED");
  const medApproved = medicineValue(data, "APPROVED");
  const pendingPct = medicineTotal ? (medPending / medicineTotal) * 100 : 0;
  const administeredPct = medicineTotal ? (medAdministered / medicineTotal) * 100 : 0;
  const approvedPct = medicineTotal ? (medApproved / medicineTotal) * 100 : 0;

  return (
    <>
      <PageHeader title={t("dashboard.title")} section={t("sections.home")}>
        <DashboardSearch />
      </PageHeader>
      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi icon={Baby} tint="bg-blue-50 text-blue-600" num={n(data?.students)} label={t("dashboard.kpiStudents")} />
          <Kpi icon={School} tint="bg-purple-50 text-purple-600" num={n(data?.classrooms)} label={t("dashboard.kpiClassrooms")} />
          <Kpi icon={Users} tint="bg-emerald-50 text-emerald-600" num={n(data?.staff)} label={t("dashboard.kpiStaff")} />
          <Kpi icon={Receipt} tint="bg-amber-50 text-amber-600" num={n(data?.outstandingInvoices)} label={t("dashboard.kpiOutstanding")} />
          <Kpi icon={AlertCircle} tint="bg-red-50 text-red-600" num={n(data?.overdueInvoices)} label={t("dashboard.kpiOverdue")} />
          <Kpi icon={Pill} tint="bg-pink-50 text-pink-600" num={n(data?.pendingMedicine)} label={t("dashboard.kpiMedicine")} />
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">{t("dashboard.attendanceTrend")}</div>
              <span className="badge b-green">{t("dashboard.present")}</span>
            </div>
            <svg viewBox="0 0 600 200" className="w-full h-48" preserveAspectRatio="none">
              <defs>
                <linearGradient id="attendanceTrend" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F26B5E" stopOpacity=".4" />
                  <stop offset="100%" stopColor="#F26B5E" stopOpacity="0" />
                </linearGradient>
              </defs>
              {area && <polyline fill="url(#attendanceTrend)" stroke="none" points={area} />}
              {line && <polyline fill="none" stroke="#F26B5E" strokeWidth="3" points={line} />}
            </svg>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3">{t("dashboard.medicineTitle")}</div>
            <div className="flex justify-center my-2">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="3" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F89A5B" strokeWidth="3" strokeDasharray={`${pendingPct} 100`} />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F26B5E" strokeWidth="3" strokeDasharray={`${administeredPct} 100`} strokeDashoffset={-pendingPct} />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7BC796" strokeWidth="3" strokeDasharray={`${approvedPct} 100`} strokeDashoffset={-(pendingPct + administeredPct)} />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">{isLoading ? "…" : medicineTotal}</div>
                    <div className="text-xs text-slate-400">{t("dashboard.thisMonth")}</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-1 mt-3">
              {[
                ["#F89A5B", t("dashboard.medPending"), medPending],
                ["#F26B5E", t("dashboard.medAdministered"), medAdministered],
                ["#7BC796", t("dashboard.medApproved"), medApproved],
              ].map(([color, label, value]) => (
                <div key={label} className="flex items-center justify-between">
                  <span className="flex items-center gap-2">
                    <span className="status-dot" style={{ backgroundColor: color as string }} />
                    {label}
                  </span>
                  <b>{isLoading ? "…" : value}</b>
                </div>
              ))}
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5 mt-5">
          <div className="card p-5">
            <div className="font-bold mb-3">{t("dashboard.revenueTitle")}</div>
            <svg viewBox="0 0 300 160" className="w-full h-40">
              {revenue.map((r, i) => {
                const h = Math.max(8, (r.amount / maxRevenue) * 140);
                const x = 10 + i * 45;
                return (
                  <rect
                    key={r.period}
                    x={x}
                    y={160 - h}
                    width="30"
                    height={h}
                    rx="4"
                    fill="#F26B5E"
                    opacity={i === revenue.length - 1 ? ".8" : ".6"}
                  />
                );
              })}
            </svg>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {revenue.map((r) => (
                <span key={r.period}>{r.month}</span>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              {t("dashboard.revenueThisMonth")}{" "}
              <b className="text-slate-700">{formatVnd(data?.revenueThisMonth ?? 0)}</b>
            </div>
          </div>

          <div className="card p-5 lg:col-span-2">
            <div className="font-bold mb-3">{t("dashboard.recentAnnouncements")}</div>
            <div className="divide-y divide-slate-100">
              {(data?.recentAnnouncements ?? []).length === 0 && (
                <div className="py-8 text-center text-sm text-muted">{t("dashboard.noAnnouncements")}</div>
              )}
              {(data?.recentAnnouncements ?? []).map((a) => {
                const badge = AUDIENCE_BADGE[a.audience] ?? "b-slate";
                const label =
                  a.audience === "CLASS" && a.classroomName
                    ? a.classroomName
                    : audienceLabel(t, a.audience);
                return (
                  <div key={a.id} className="py-2.5 flex items-start gap-3">
                    <span className={`badge ${badge}`}>{label}</span>
                    <div className="flex-1">
                      <div className="text-sm font-semibold">{a.title}</div>
                      <div className="text-xs text-slate-400">{dateAgo(t, a.publishedAt)}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
