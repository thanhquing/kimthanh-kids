import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Gộp class Tailwind (chuẩn shadcn/ui). */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Định dạng tiền VND (số nguyên đồng). */
export function formatVnd(n: number): string {
  return new Intl.NumberFormat("vi-VN").format(n) + "đ";
}

/** Chữ cái đầu để dựng avatar (1 ký tự — theo mock). */
export function initials(name?: string | null): string {
  const trimmed = (name ?? "").trim();
  if (!trimmed) return "?";
  const parts = trimmed.split(/\s+/);
  return (parts[parts.length - 1][0] ?? "?").toUpperCase();
}

/** Tuổi tính theo năm tròn từ ngày sinh ISO. */
export function ageFrom(iso?: string | null): number | null {
  if (!iso) return null;
  const dob = new Date(iso);
  if (Number.isNaN(dob.getTime())) return null;
  const now = new Date();
  let age = now.getFullYear() - dob.getFullYear();
  const m = now.getMonth() - dob.getMonth();
  if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;
  return age;
}

/** ISO → "YYYY-MM-DD" cho input[type=date]. */
export function toDateInput(iso?: string | null): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

/** Tải xuống CSV phía client (BOM để Excel mở đúng tiếng Việt). */
export function downloadCsv(filename: string, rows: (string | number)[][]) {
  const escape = (v: string | number) => {
    const s = String(v ?? "");
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = rows.map((r) => r.map(escape).join(",")).join("\n");
  const blob = new Blob(["﻿" + csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
