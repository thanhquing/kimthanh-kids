import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { badgeFor, CYCLE_LABEL, formatDate, SUB_STATUS, TIER_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

const STATUSES = ["", "TRIALING", "ACTIVE", "PAST_DUE", "SUSPENDED", "CANCELED"];

/** VND → "1.2tr" / "0đ". */
function mrrShort(v?: number): string {
  if (!v) return "0đ";
  return `${parseFloat((v / 1_000_000).toFixed(2))}tr`;
}

export function SubscriptionsPage() {
  const navigate = useNavigate();
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
      <PageHeader section="Khách hàng" title="Thuê bao" />
      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="kpi">
            <div className="num text-emerald-600">{stats?.ACTIVE ?? "—"}</div>
            <div className="lbl">Đang hoạt động</div>
          </div>
          <div className="kpi">
            <div className="num text-amber-600">{stats?.TRIALING ?? "—"}</div>
            <div className="lbl">Dùng thử</div>
          </div>
          <div className="kpi">
            <div className="num text-red-600">{stats?.PAST_DUE ?? "—"}</div>
            <div className="lbl">Quá hạn</div>
          </div>
          <div className="kpi">
            <div className="num text-slate-500">{stats ? canceledExpired : "—"}</div>
            <div className="lbl">Đã hủy/hết hạn</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={cn("chip", status === s && "active")}
              onClick={() => setStatus(s)}
            >
              {s === "" ? "Tất cả" : (SUB_STATUS[s]?.label ?? s)}
            </button>
          ))}
        </div>

        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Trường</th>
                <th>Gói</th>
                <th>Chu kỳ</th>
                <th>Trạng thái</th>
                <th>Kỳ hiện tại</th>
                <th>Tự gia hạn</th>
                <th>MRR</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={7} className="!text-center text-muted">Đang tải…</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={7} className="!text-center text-red-600">Không tải được.</td>
                </tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={7} className="!text-center text-muted">Chưa có thuê bao.</td>
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
                    <td>{s.plan ? (TIER_LABEL[s.plan.tier] ?? s.plan.name) : "—"}</td>
                    <td>{s.billingCycle ? (CYCLE_LABEL[s.billingCycle] ?? s.billingCycle) : "—"}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>
                      {s.currentPeriodStart || s.currentPeriodEnd
                        ? `${formatDate(s.currentPeriodStart)} – ${formatDate(s.currentPeriodEnd)}`
                        : "—"}
                    </td>
                    <td className={s.autoRenew ? "text-emerald-600 font-medium" : "text-slate-400"}>
                      {s.autoRenew ? "Bật" : "Tắt"}
                    </td>
                    <td className="font-semibold">{mrrShort(s.mrr)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
