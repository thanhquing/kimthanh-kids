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
