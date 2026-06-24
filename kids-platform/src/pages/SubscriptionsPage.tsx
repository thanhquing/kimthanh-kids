import { useQuery } from "@tanstack/react-query";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { badgeFor, CYCLE_LABEL, formatDate, SUB_STATUS, TIER_LABEL } from "@/lib/labels";
import { cn } from "@/lib/utils";

export function SubscriptionsPage() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["subscriptions"],
    queryFn: () => platform.listSubscriptions(1),
  });
  const items = data ?? [];

  return (
    <>
      <PageHeader title="Thuê bao" />
      <main className="p-6">
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Trường (ID)</th>
                <th>Gói</th>
                <th>Chu kỳ</th>
                <th>Trạng thái</th>
                <th>Kỳ hiện tại</th>
                <th>Tự gia hạn</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr>
                  <td colSpan={6} className="!text-center text-muted">Đang tải…</td>
                </tr>
              )}
              {error && (
                <tr>
                  <td colSpan={6} className="!text-center text-red-600">Không tải được.</td>
                </tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr>
                  <td colSpan={6} className="!text-center text-muted">Chưa có thuê bao.</td>
                </tr>
              )}
              {items.map((s) => {
                const st = badgeFor(SUB_STATUS, s.status);
                return (
                  <tr key={s.id}>
                    <td className="font-mono text-xs">{s.tenantId.slice(0, 8)}…</td>
                    <td>{s.plan ? (TIER_LABEL[s.plan.tier] ?? s.plan.name) : "—"}</td>
                    <td>{s.billingCycle ? (CYCLE_LABEL[s.billingCycle] ?? s.billingCycle) : "—"}</td>
                    <td>
                      <span className={cn("badge", st.badge)}>{st.label}</span>
                    </td>
                    <td>{formatDate(s.currentPeriodEnd)}</td>
                    <td className={s.autoRenew ? "text-emerald-600 font-medium" : "text-slate-400"}>
                      {s.autoRenew ? "Bật" : "Tắt"}
                    </td>
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
