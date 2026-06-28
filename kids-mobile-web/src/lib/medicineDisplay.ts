import type { MedicineStatus } from "@/api/medicine";
import type { Translator } from "@/i18n";
import type { Language } from "@/lib/language";

export const medicineStatusFilters: Array<MedicineStatus | "ALL"> = [
  "ALL",
  "PENDING",
  "APPROVED",
  "ADMINISTERED",
  "REJECTED",
];

export function medicineStatusLabel(status: MedicineStatus | "ALL", t: Translator) {
  const key = {
    ALL: "medicine.filterAll",
    PENDING: "medicine.statusPending",
    APPROVED: "medicine.statusApproved",
    ADMINISTERED: "medicine.statusAdministered",
    REJECTED: "medicine.statusRejected",
  }[status] as Parameters<Translator>[0];
  return t(key);
}

export function formatDateRange(startDate: string, endDate: string, lang: Language) {
  const format = new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
    day: "2-digit",
    month: "2-digit",
  });
  return `${format.format(new Date(startDate))} - ${format.format(new Date(endDate))}`;
}

