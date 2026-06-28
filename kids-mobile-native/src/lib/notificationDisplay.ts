import type { NotificationType } from "@/api/notifications";
import type { Translator } from "@/i18n";

export function notificationTypeLabel(type: NotificationType, t: Translator) {
  const key = {
    ATTENDANCE: "notifications.typeAttendance",
    DAILY_REPORT: "notifications.typeDailyReport",
    ANNOUNCEMENT: "notifications.typeAnnouncement",
    INVOICE: "notifications.typeInvoice",
    MEDICINE: "notifications.typeMedicine",
    LEAVE: "notifications.typeLeave",
    INCIDENT: "notifications.typeIncident",
  }[type] as Parameters<Translator>[0];
  return t(key);
}

