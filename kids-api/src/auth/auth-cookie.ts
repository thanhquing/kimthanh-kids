import { CookieOptions, Request, Response } from "express";
import { EnvService } from "../config/env.service";

/**
 * Refresh token đặt trong cookie `HttpOnly` thay vì trả ra body (JS đọc được → rủi ro XSS
 * lấy cắp credential dài hạn). Web FE gọi API same-origin (Vite proxy dev / nginx prod) nên
 * cookie tự gửi kèm; `SameSite=Lax` + refresh là `POST` đủ chặn CSRF; host-only (không set
 * Domain) → mỗi subdomain tenant cô lập cookie riêng.
 *
 * Path bó hẹp về nhóm `/auth` → cookie CHỈ gửi tới login/refresh/logout, không rò sang API khác.
 */
export const REFRESH_COOKIE = "kk_rt";

/** Path cookie bám global prefix (route thật là `/<prefix>/auth/*`) — đổi prefix không làm lệch path. */
function cookiePath(env: EnvService): string {
  return `/${env.get("API_GLOBAL_PREFIX")}/auth`;
}

function baseOptions(env: EnvService): CookieOptions {
  // Secure mặc định theo prod; cho override khi TLS kết thúc ở proxy mà app thấy http.
  const secureEnv = env.get("AUTH_COOKIE_SECURE");
  const secure = secureEnv === undefined ? env.isProd : secureEnv === "true";
  return {
    httpOnly: true,
    secure,
    sameSite: "lax",
    path: cookiePath(env),
  };
}

export function setRefreshCookie(
  res: Response,
  token: string,
  maxAgeMs: number,
  env: EnvService,
): void {
  res.cookie(REFRESH_COOKIE, token, { ...baseOptions(env), maxAge: maxAgeMs });
}

export function clearRefreshCookie(res: Response, env: EnvService): void {
  // clearCookie phải khớp path/secure/sameSite để trình duyệt xoá đúng cookie.
  res.clearCookie(REFRESH_COOKIE, baseOptions(env));
}

/**
 * Client KHÔNG có cookie jar (app native React Native) tự khai qua header `x-client: native`.
 * Với client này refresh token PHẢI trả trong body để lưu vào SecureStore (Keychain/Keystore) —
 * cookie HttpOnly chỉ dành cho web (same-origin, chống XSS). Web KHÔNG gửi header này nên vẫn
 * cookie-only, giữ nguyên hardening.
 */
export function isCookielessClient(req: Request): boolean {
  return req.headers["x-client"] === "native";
}

/** Đọc refresh token từ cookie (không cần cookie-parser — parse header thủ công). */
export function readRefreshCookie(req: Request): string | undefined {
  const raw = req.headers.cookie;
  if (!raw) return undefined;
  for (const part of raw.split(";")) {
    const idx = part.indexOf("=");
    if (idx === -1) continue;
    const name = part.slice(0, idx).trim();
    if (name === REFRESH_COOKIE) return decodeURIComponent(part.slice(idx + 1).trim());
  }
  return undefined;
}
