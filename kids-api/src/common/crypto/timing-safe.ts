import { timingSafeEqual } from "node:crypto";

/**
 * So sánh 2 chuỗi hex (vd HMAC digest) theo kiểu constant-time để tránh timing attack.
 * Trả false nếu thiếu giá trị hoặc khác độ dài (timingSafeEqual yêu cầu buffer cùng size).
 */
export function timingSafeEqualHex(a?: string, b?: string): boolean {
  if (!a || !b) return false;
  const bufA = Buffer.from(a.toLowerCase(), "hex");
  const bufB = Buffer.from(b.toLowerCase(), "hex");
  if (bufA.length === 0 || bufA.length !== bufB.length) return false;
  return timingSafeEqual(bufA, bufB);
}
