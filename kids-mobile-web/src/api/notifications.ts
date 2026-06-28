import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type NotificationType =
  | "ATTENDANCE"
  | "DAILY_REPORT"
  | "ANNOUNCEMENT"
  | "INVOICE"
  | "MEDICINE"
  | "LEAVE"
  | "INCIDENT";

export type AppNotification = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkType?: string | null;
  linkId?: string | null;
  readAt?: string | null;
  createdAt: string;
};

export type NotificationPreference = {
  type: NotificationType;
  enabled: boolean;
};

export const notificationKeys = {
  all: ["notifications"] as const,
  feed: () => [...notificationKeys.all, "feed"] as const,
  preferences: () => [...notificationKeys.all, "preferences"] as const,
};

export function listNotifications() {
  return api.get<AppNotification[]>("/notifications");
}

export function listNotificationPreferences() {
  return api.get<NotificationPreference[]>("/notifications/preferences");
}

export function setNotificationPreference(input: NotificationPreference) {
  return api.patch<NotificationPreference>("/notifications/preferences", input);
}

export function markAllNotificationsRead() {
  return api.post<{ updated: number }>("/notifications/read-all");
}

export function useNotifications() {
  return useQuery({
    queryKey: notificationKeys.feed(),
    queryFn: listNotifications,
  });
}

export function useNotificationPreferences() {
  return useQuery({
    queryKey: notificationKeys.preferences(),
    queryFn: listNotificationPreferences,
  });
}

export function useSetNotificationPreference() {
  return useMutation({
    mutationFn: setNotificationPreference,
  });
}

export function useMarkAllNotificationsRead() {
  return useMutation({
    mutationFn: markAllNotificationsRead,
  });
}

