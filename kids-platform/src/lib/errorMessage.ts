// BL-006: copy lỗi ổn định theo error.code (không phụ thuộc message backend, không lộ raw).
// Ưu tiên i18n theo code → message backend (đã localize theo x-language) → generic.
import { ApiError } from "@/api/http";
import type { TKey, Translator } from "@/i18n";

// error.code → i18n key. Chỉ map các code có copy ổn định; code lạ rơi về message backend.
const ERROR_KEYS: Record<string, TKey> = {
  QUOTA_EXCEEDED: "errors.QUOTA_EXCEEDED",
  FEATURE_NOT_AVAILABLE: "errors.FEATURE_NOT_AVAILABLE",
  NO_BANK_CONFIG: "errors.NO_BANK_CONFIG",
  NOT_FOUND: "errors.NOT_FOUND",
  FORBIDDEN: "errors.FORBIDDEN",
  VALIDATION_FAILED: "errors.VALIDATION_FAILED",
  INVALID_CREDENTIALS: "errors.INVALID_CREDENTIALS",
  TENANT_REQUIRED: "errors.TENANT_REQUIRED",
  ACCOUNT_LOCKED: "errors.ACCOUNT_LOCKED",
  SLUG_UNAVAILABLE: "errors.SLUG_UNAVAILABLE",
  NO_PUBLIC_PRICE: "errors.NO_PUBLIC_PRICE",
};

/** Message hiển thị cho lỗi bất kỳ: i18n theo code, fallback message backend rồi generic. */
export function errorMessage(e: unknown, t: Translator): string {
  if (e instanceof ApiError) {
    const key = ERROR_KEYS[e.code];
    if (key) return t(key);
    if (e.message) return e.message; // backend đã localize theo x-language
  }
  return t("errors.generic");
}
