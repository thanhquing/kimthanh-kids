import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CircleCheck, Clock, Gauge, Lock, Receipt, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { badgeFor, formatDate, SUB_STATUS } from "@/lib/labels";
import { invalidatePlatformData } from "@/lib/queries";
import { formatVnd } from "@/lib/utils";

function Stat({
  icon: Icon,
  tint,
  num,
  label,
  to,
}: {
  icon: typeof Sparkles;
  tint: string;
  num: ReactNode;
  label: string;
  to?: string;
}) {
  const body = (
    <>
      <div className={`w-9 h-9 rounded-xl grid place-items-center ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </>
  );
  if (to) {
    return (
      <Link to={to} className="kpi hover:shadow-md transition-shadow cursor-pointer">
        {body}
      </Link>
    );
  }
  return <div className="kpi">{body}</div>;
}

export function WorklistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { t } = useT();
  const { data, isLoading } = useQuery({ queryKey: ["worklist"], queryFn: () => platform.worklist() });

  const markPaid = useMutation({
    mutationFn: (id: string) => platform.markPaid(id),
    onSuccess: () => {
      toast(t("wl.toastPaid"));
      invalidatePlatformData(qc);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("td.toastErr"), "error"),
  });

  const trial = data?.trial;
  const q = data?.quota;
  const d = data?.dunning;
  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));

  return (
    <>
      <PageHeader title={t("nav.worklist")} section={t("navGroups.operations")} />

      <main className="p-6 space-y-6">
        {/* ── Phễu dùng thử ── */}
        <section>
          <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
            <Sparkles className="w-4 h-4 text-[color:var(--primary)]" />
            {t("wl.trialFunnel")}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <Stat icon={Sparkles} tint="bg-amber-50 text-amber-600" num={n(trial?.active)} label={t("wl.trialActive")} />
            <Stat icon={Clock} tint="bg-red-50 text-red-600" num={n(trial?.expiringSoon)} label={t("wl.expiringSoon")} />
            <Stat
              icon={TrendingUp}
              tint="bg-emerald-50 text-emerald-600"
              num={isLoading ? "…" : `${trial?.conversionRate ?? 0}%`}
              label={t("wl.conversionRate", { converted: trial?.converted ?? 0, ended: trial?.endedTotal ?? 0 })}
            />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("wl.colTenant")}</th>
                    <th>{t("wl.colPlan")}</th>
                    <th>{t("wl.colExpiry")}</th>
                    <th>{t("wl.colRemaining")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (trial?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="!text-center text-muted">{t("wl.noTrials")}</td></tr>
                  )}
                  {(trial?.items ?? []).map((it) => (
                    <tr key={it.tenantId} className="hover:bg-[#fff8f3]">
                      <td className="font-semibold">{it.tenantName ?? it.tenantId.slice(0, 8)}</td>
                      <td>{it.planName ?? "—"}</td>
                      <td className="text-slate-500">{formatDate(it.trialEndsAt)}</td>
                      <td>
                        <span
                          className={`badge ${it.daysLeft != null && it.daysLeft <= 3 ? "b-red" : "b-amber"}`}
                        >
                          {it.daysLeft != null ? t("wl.days", { n: it.daysLeft }) : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/tenants/${it.tenantId}`}
                          className="text-xs text-[color:var(--primary)] font-semibold"
                        >
                          {t("wl.view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Cơ hội nâng gói do sắp chạm quota — KPI bấm được, dẫn sang trang Trường đã lọc ── */}
        <section>
          <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
            <Gauge className="w-4 h-4 text-[color:var(--primary)]" />
            {t("wl.quotaSection")}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Stat
              icon={TrendingUp}
              tint="bg-emerald-50 text-emerald-600"
              num={n(q?.tenants)}
              label={t("wl.quotaTenants")}
              to="/tenants?quota=at-risk"
            />
            <Stat
              icon={Gauge}
              tint="bg-orange-50 text-orange-600"
              num={n(q?.atRisk)}
              label={t("wl.quotaRows", { pct: q?.thresholdPct ?? 80 })}
              to="/tenants?quota=at-risk"
            />
          </div>
          <p className="text-xs text-slate-400 mt-3">{t("wl.quotaHint")}</p>
        </section>

        {/* ── Công nợ cần thu ── */}
        <section>
          <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
            <Receipt className="w-4 h-4 text-[color:var(--primary)]" />
            {t("wl.dunningSection")}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat icon={AlertCircle} tint="bg-red-50 text-red-600" num={n(d?.overdueCount)} label={t("wl.overdueCount")} />
            <Stat
              icon={Receipt}
              tint="bg-pink-50 text-pink-600"
              num={isLoading ? "…" : `${((d?.overdueAmount ?? 0) / 1_000_000).toFixed(1)}${t("dash.millionsUnit")}`}
              label={t("wl.overdueAmount")}
            />
            <Stat icon={Clock} tint="bg-amber-50 text-amber-600" num={n(d?.atRiskSuspend)} label={t("wl.atRiskSuspend")} />
            <Stat icon={Lock} tint="bg-slate-100 text-slate-500" num={n(d?.suspended)} label={t("wl.suspended")} />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("wl.colInvoice")}</th>
                    <th>{t("wl.colTenant")}</th>
                    <th>{t("wl.colDue")}</th>
                    <th>{t("wl.colDeadline")}</th>
                    <th>{t("wl.colLate")}</th>
                    <th>{t("common.status")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (d?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={7} className="!text-center text-muted">{t("wl.noDunning")}</td></tr>
                  )}
                  {(d?.items ?? []).map((it) => {
                    const b = badgeFor(SUB_STATUS, it.subStatus ?? undefined);
                    return (
                      <tr key={it.invoiceId} className="hover:bg-[#fff8f3]">
                        <td className="font-mono text-xs">{it.invoiceNumber}</td>
                        <td className="font-semibold">{it.tenantName ?? it.tenantId.slice(0, 8)}</td>
                        <td className="font-semibold">{formatVnd(it.amountDue)}</td>
                        <td className="text-slate-500">{formatDate(it.dueAt)}</td>
                        <td>
                          <span className="badge b-red">{t("wl.days", { n: it.daysLate ?? 0 })}</span>
                        </td>
                        <td>
                          <span className={`badge ${b.badge}`}>{b.label}</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn-soft text-xs"
                            disabled={markPaid.isPending}
                            onClick={() => markPaid.mutate(it.invoiceId)}
                          >
                            <CircleCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            {t("wl.markPaid")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            {t("wl.dunningHintPre")}
            <b>{t("wl.dunningHintBold")}</b>
            {t("wl.dunningHintPost")}
          </p>
        </section>
      </main>
    </>
  );
}
