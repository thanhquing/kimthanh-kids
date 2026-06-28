import { Bell, Settings } from "lucide-react";
import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  notificationKeys,
  useMarkAllNotificationsRead,
  useNotificationPreferences,
  useNotifications,
  useSetNotificationPreference,
} from "@/api/notifications";
import { TopBar } from "@/components/mobile/MobileShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { formatShortDate } from "@/lib/date";
import { notificationTypeLabel } from "@/lib/notificationDisplay";

export function NotificationsPage() {
  const { t, lang } = useT();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const notificationsQuery = useNotifications();
  const preferencesQuery = useNotificationPreferences();
  const setPreference = useSetNotificationPreference();
  const markAllRead = useMarkAllNotificationsRead();
  const notifications = notificationsQuery.data ?? [];
  const unread = notifications.filter((item) => !item.readAt).length;

  async function onMarkAllRead() {
    const result = await markAllRead.mutateAsync();
    await queryClient.invalidateQueries({ queryKey: notificationKeys.feed() });
    toast(t("notifications.markedRead", { count: result.updated }));
  }

  return (
    <>
      <TopBar title={t("notifications.title")} rightIcon={Settings} onRight={() => setSettingsOpen(true)} />
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="font-bold">{t("notifications.unread", { count: unread })}</div>
        <button type="button" onClick={onMarkAllRead} className="mt-3 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
          {t("notifications.markAllRead")}
        </button>
      </div>
      <div className="mt-3 space-y-2">
        {notificationsQuery.isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
        {notificationsQuery.isError ? <div className="card p-4 text-sm text-red-600">{t("notifications.listError")}</div> : null}
        {!notificationsQuery.isLoading && !notificationsQuery.isError && notifications.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("notifications.empty")}</div>
        ) : null}
        {notifications.map((notification) => (
          <div key={notification.id} className="card flex gap-3 p-3">
            <Bell className="h-5 w-5 text-[color:var(--primary)]" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{notification.title}</div>
              {notification.body ? <div className="mt-1 text-xs text-slate-500">{notification.body}</div> : null}
              <div className="mt-1 text-[11px] text-slate-400">
                {notificationTypeLabel(notification.type, t)} · {formatShortDate(notification.createdAt, lang)}
              </div>
            </div>
            {!notification.readAt ? <span className="mt-1 h-2 w-2 rounded-full bg-[color:var(--primary)]" /> : null}
          </div>
        ))}
      </div>
      <BottomSheet open={settingsOpen} title={t("notifications.settings")} onClose={() => setSettingsOpen(false)}>
        <div className="space-y-3">
          {preferencesQuery.isLoading ? <div className="text-sm text-slate-500">{t("common.loading")}</div> : null}
          {(preferencesQuery.data ?? []).map((item) => (
            <div key={item.type} className="card flex items-center justify-between p-3">
              <div className="text-sm font-semibold">{notificationTypeLabel(item.type, t)}</div>
              <button
                type="button"
                className={`chip ${item.enabled ? "active" : ""}`}
                onClick={async () => {
                  await setPreference.mutateAsync({ type: item.type, enabled: !item.enabled });
                  await queryClient.invalidateQueries({ queryKey: notificationKeys.preferences() });
                }}
              >
                {item.enabled ? t("profile.notificationsOn") : t("profile.off")}
              </button>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}
