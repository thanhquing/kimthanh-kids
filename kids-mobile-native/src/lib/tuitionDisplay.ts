import type { TuitionInvoiceStatus } from "@/api/tuition";
import type { Translator } from "@/i18n";
import type { Language } from "@/lib/language";

export const tuitionFilters: (TuitionInvoiceStatus | "DUE" | "ALL")[] = ["DUE", "PAID", "ALL"];

export function tuitionStatusLabel(status: TuitionInvoiceStatus | "DUE" | "ALL", t: Translator) {
  const key = {
    DUE: "tuition.filterDue",
    ALL: "tuition.filterAll",
    UNPAID: "tuition.statusUnpaid",
    PARTIAL: "tuition.statusPartial",
    PAID: "tuition.statusPaid",
    OVERDUE: "tuition.statusOverdue",
    CANCELED: "tuition.statusCanceled",
  }[status] as Parameters<Translator>[0];
  return t(key);
}

export function formatInvoiceDate(date: string, lang: Language) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US").format(value);
}

export function isDueStatus(status: TuitionInvoiceStatus) {
  return status === "UNPAID" || status === "PARTIAL" || status === "OVERDUE";
}
