import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { t as tr, useT } from "@/i18n";
import { badgeFor, cycleLabel, formatDate, SUB_STATUS, tierLabel } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUSES = ["", "TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"];

/** VND → "1.2tr" / "0đ" (vi) hoặc "1.2M" / "0₫" (en). */
function mrrShort(v?: number): string {
  if (!v) return `0${tr("common.currency")}`;
  return `${parseFloat((v / 1_000_000).toFixed(2))}${tr("dash.millionsUnit")}`;
}

export function SubscriptionsPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [status, setStatus] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions", status],
    queryFn: () => platform.listSubscriptions(1, status || undefined),
  });
  const { data: stats } = useQuery({
    queryKey: ["subscriptions", "stats"],
    queryFn: () => platform.subscriptionStats(),
  });

  const items = data?.items ?? [];
  const canceledExpired = (stats?.CANCELED ?? 0) + (stats?.EXPIRED ?? 0);

  return (
    <>
      <PageHeader section={t("navGroups.customers")} title={t("subs.title")} />
      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="kpi">
            <div className="num text-emerald-600">{stats?.ACTIVE ?? "—"}</div>
            <div className="lbl">{t("subs.kpiActive")}</div>
          </div>
          <div className="kpi">
            <div className="num text-amber-600">{stats?.TRIALING ?? "—"}</div>
            <div className="lbl">{t("subs.kpiTrial")}</div>
          </div>
          <div className="kpi">
            <div className="num text-red-600">{stats?.PAST_DUE ?? "—"}</div>
            <div className="lbl">{t("subs.kpiPastDue")}</div>
          </div>
          <div className="kpi">
            <div className="num text-slate-500">{stats ? canceledExpired : "—"}</div>
            <div className="lbl">{t("subs.kpiCanceled")}</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={cn("chip", status === s && "active")}
              onClick={() => setStatus(s)}
            >
              {s === "" ? t("common.all") : badgeFor(SUB_STATUS, s).label}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("subs.colTenant")}</th>
                <th>{t("subs.colPlan")}</th>
                <th>{t("subs.colCycle")}</th>
                <th>{t("common.status")}</th>
                <th>{t("subs.colPeriod")}</th>
                <th>{t("subs.colAutoRenew")}</th>
                <th>{t("subs.colMrr")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="!text-center text-muted">{t("common.loading")}</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="!text-center text-red-600">{t("subs.loadError")}</td>
                </tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="!text-center text-muted">{t("dash.noSubs")}</td>
                </tr>
              )}
              {items.map((s) => {
                const st = badgeFor(SUB_STATUS, s.status);
                return (
                  <tr
                    key={s.id}
                    className="hover:bg-[#fff8f3] cursor-pointer"
                    onClick={() => navigate(`/tenants/${s.tenantId}`)}
                  >
                    <td className="font-semibold">{s.tenantName ?? s.tenantSlug ?? s.tenantId.slice(0, 8)}</td>
                    <td>{s.plan ? (tierLabel(s.plan.tier) ?? s.plan.name) : "—"}</td>
                    <td>{s.billingCycle ? cycleLabel(s.billingCycle) : "—"}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>
                      {s.currentPeriodStart || s.currentPeriodEnd
                        ? `${formatDate(s.currentPeriodStart)} – ${formatDate(s.currentPeriodEnd)}`
                        : "—"}
                    </td>
                    <td className={s.autoRenew ? "text-emerald-600 font-medium" : "text-slate-400"}>
                      {s.autoRenew ? t("td.on") : t("td.off")}
                    </td>
                    <td className="font-semibold">{mrrShort(s.mrr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
          </div>
        </div>
      </main>
    </>
  );
}
