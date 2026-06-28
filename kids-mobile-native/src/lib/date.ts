import type { Language } from "@/lib/language";

export function toDateInputValue(date: Date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

export function formatShortDate(date: string, lang: Language) {
  const value = new Date(date);
  if (Number.isNaN(value.getTime())) return date;
  return new Intl.DateTimeFormat(lang === "vi" ? "vi-VN" : "en-US", {
    weekday: "short",
    day: "2-digit",
    month: "2-digit",
  }).format(value);
}

export function recentDateInputs(count: number) {
  return Array.from({ length: count }, (_, index) => {
    const date = new Date();
    date.setDate(date.getDate() - index);
    return toDateInputValue(date);
  });
}

