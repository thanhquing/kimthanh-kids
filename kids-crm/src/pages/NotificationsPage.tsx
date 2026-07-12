import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { crm, type NotificationType } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { LoadMore } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT, type TKey } from "@/i18n";
import { formatDateTime } from "@/lib/labels";
import { cn } from "@/lib/utils";

const TYPE_KEY: Record<NotificationType, TKey> = {
  ATTENDANCE: "notificationType.ATTENDANCE",
  DAILY_REPORT: "notificationType.DAILY_REPORT",
  ANNOUNCEMENT: "notificationType.ANNOUNCEMENT",
  INVOICE: "notificationType.INVOICE",
  MEDICINE: "notificationType.MEDICINE",
  LEAVE: "notificationType.LEAVE",
  INCIDENT: "notificationType.INCIDENT",
};

export function NotificationsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const feed = useLoadMore(["notifications"], (pg) => crm.notifications.feedPage(pg));
  const prefs = useQuery({ queryKey: ["notification-prefs"], queryFn: () => crm.notifications.preferences() });
  const markRead = useMutation({
    mutationFn: (id: string) => crm.notifications.markRead(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });
  const markAll = useMutation({
    mutationFn: () => crm.notifications.markAllRead(),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notifications"] });
      qc.invalidateQueries({ queryKey: ["notification-count"] });
      toast(t("common.saved"));
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });
  const setPref = useMutation({
    mutationFn: ({ type, enabled }: { type: NotificationType; enabled: boolean }) =>
      crm.notifications.setPreference(type, enabled),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["notification-prefs"] });
      toast(t("common.saved"));
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  return (
    <>
      <PageHeader title={t("feature.notificationsTitle")} section={t("feature.notificationsSection")} />
      <main className="grid gap-4 p-6 lg:grid-cols-[1fr_320px]">
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between border-b border-slate-100 p-4">
            <h2 className="font-bold">{t("topbar.notifications")}</h2>
            <button className="btn-soft text-sm" onClick={() => markAll.mutate()} disabled={markAll.isPending}>
              {t("common.markAllRead")}
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {feed.isLoading ? (
              <div className="p-4 text-sm text-slate-400">{t("common.loading")}</div>
            ) : feed.items.map((n) => (
              <div key={n.id} className={cn("p-4", !n.readAt && "bg-orange-50/60")}>
                <div className="flex gap-3">
                  <span className="badge b-peach h-fit">{t(TYPE_KEY[n.type])}</span>
                  <div className="min-w-0 flex-1">
                    <div className="font-semibold">{n.title}</div>
                    {n.body && <p className="mt-1 text-sm text-slate-600">{n.body}</p>}
                    <div className="mt-2 text-xs text-slate-400">{formatDateTime(n.createdAt)}</div>
                  </div>
                  {!n.readAt && (
                    <button className="text-xs text-[color:var(--primary-600)]" onClick={() => markRead.mutate(n.id)}>
                      {t("common.markRead")}
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>
          <div className="p-4">
            <LoadMore
              hasMore={feed.hasNextPage}
              loading={feed.isFetchingNextPage}
              onMore={() => feed.fetchNextPage()}
            />
          </div>
        </section>
        <aside className="card h-fit p-4">
          <h2 className="mb-3 font-bold">{t("feature.preferences")}</h2>
          <div className="space-y-3">
            {(prefs.data ?? []).map((p) => (
              <label key={p.type} className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 p-3 text-sm">
                <span>{t(TYPE_KEY[p.type])}</span>
                <input
                  type="checkbox"
                  checked={p.enabled}
                  onChange={(e) => setPref.mutate({ type: p.type, enabled: e.target.checked })}
                />
              </label>
            ))}
          </div>
        </aside>
      </main>
    </>
  );
}
