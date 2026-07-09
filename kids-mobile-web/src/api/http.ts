/**
 * Lớp HTTP dùng chung cho kids-mobile-web.
 * Copy từ kids-platform/src/api/http.ts (file mẫu), chỉnh token store cho app mobile.
 *
 * Xử lý tập trung hợp đồng API của kids-api:
 *  - base URL `/api` (dev: Vite proxy gắn Host=TENANT_HOST; prod: nginx → kids-api)
 *  - bóc envelope `{ success, data }`; lỗi → ném ApiError(code, message)
 *  - gắn Authorization: Bearer
 *  - 401 → thử refresh 1 lần → retry → nếu vẫn hỏng thì logout
 */
const BASE = "/api";
const LANGUAGE_KEY = "kk_mw_lang";
const TENANT_KEY = "kk_mw_tenant";

/**
 * Tenant đã chọn ở màn login (độc lập subdomain). Lưu để gắn header `x-tenant` cho mọi request:
 * cần lúc login (server chưa có token để biết trường); sau login token đã mang tenantId nên header
 * chỉ bổ trợ (TenantGuard vẫn chặn nếu lệch token).
 */
export const tenantStore = {
  get id() {
    return localStorage.getItem(TENANT_KEY);
  },
  set(id: string) {
    localStorage.setItem(TENANT_KEY, id);
  },
  clear() {
    localStorage.removeItem(TENANT_KEY);
  },
};

/**
 * Access token giữ TRONG BỘ NHỚ (không localStorage) → giảm bề mặt XSS đọc cắp token.
 * Refresh token KHÔNG còn ở JS: nằm trong cookie `HttpOnly` do server set (xem kids-api auth-cookie).
 * Reload trang mất access in-memory → gọi `bootstrapAuth()` để lấy access mới từ cookie.
 */
let accessToken: string | null = null;
export const tokenStore = {
  get access() {
    return accessToken;
  },
  set(access: string) {
    accessToken = access;
  },
  clear() {
    accessToken = null;
  },
};

export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

/** Gọi khi hết phiên — gán ở App để điều hướng về /login. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: () => void) {
  onUnauthorized = fn;
}

type Options = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
  auth?: boolean; // mặc định true
};

function buildUrl(path: string, query?: Options["query"]): string {
  const url = new URL(BASE + path, window.location.origin);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.pathname + url.search;
}

async function raw(method: string, path: string, opts: Options, token: string | null) {
  const headers: Record<string, string> = {
    "x-language": localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "vi",
  };
  const isForm = typeof FormData !== "undefined" && opts.body instanceof FormData;
  if (opts.body !== undefined && !isForm) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && token) headers["Authorization"] = `Bearer ${token}`;
  const tenantId = localStorage.getItem(TENANT_KEY);
  if (tenantId) headers["x-tenant"] = tenantId;
  return fetch(buildUrl(path, opts.query), {
    method,
    headers,
    // Gửi kèm cookie HttpOnly (refresh token) — same-origin nên trình duyệt tự đính, "include" cho chắc.
    credentials: "include",
    body: opts.body !== undefined ? (isForm ? (opts.body as FormData) : JSON.stringify(opts.body)) : undefined,
  });
}

/** Đổi refresh cookie lấy access token mới. Không gửi body — server đọc cookie `kk_rt`. */
async function refreshTokens(): Promise<boolean> {
  const res = await raw("POST", "/auth/refresh", { auth: false }, null);
  if (!res.ok) return false;
  const json = await res.json().catch(() => null);
  const data = json?.data ?? json;
  if (data?.accessToken) {
    tokenStore.set(data.accessToken);
    return true;
  }
  return false;
}

/** Khôi phục phiên khi mở/reload app: đổi refresh cookie (nếu còn) lấy access in-memory. */
export async function bootstrapAuth(): Promise<boolean> {
  if (tokenStore.access) return true;
  return refreshTokens();
}

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (res.ok && json?.success !== false) {
    return (json?.data ?? json) as T;
  }
  const err = json?.error ?? {};
  throw new ApiError(err.code ?? "UNKNOWN", err.message ?? res.statusText, res.status);
}

async function send(method: string, path: string, opts: Options = {}): Promise<Response> {
  let res = await raw(method, path, opts, tokenStore.access);
  if (res.status === 401 && opts.auth !== false) {
    if (await refreshTokens()) {
      res = await raw(method, path, opts, tokenStore.access);
    } else {
      tokenStore.clear();
      tenantStore.clear(); // hết phiên → dọn cả tenant đã chọn (nhất quán với logout)
      onUnauthorized?.();
    }
  }
  return res;
}

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  return parse<T>(await send(method, path, opts));
}

export type Meta = { page?: number; pageSize?: number; total?: number; [k: string]: unknown };
export type Page<T> = { items: T[]; meta: Meta };
export type PageParams = { page?: number; pageSize?: number; limit?: number };

/** GET danh sách phân trang: trả cả `items` lẫn `meta` (envelope `{ data, meta }`). */
async function getPage<T>(path: string, opts: Options = {}): Promise<Page<T>> {
  const res = await send("GET", path, opts);
  const json = await res.json().catch(() => null);
  if (res.ok && json?.success !== false) {
    return { items: (json?.data ?? []) as T[], meta: (json?.meta ?? {}) as Meta };
  }
  const err = json?.error ?? {};
  throw new ApiError(err.code ?? "UNKNOWN", err.message ?? res.statusText, res.status);
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>("GET", path, opts ?? {}),
  getPage,
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: Options) => request<T>("DELETE", path, opts ?? {}),
};
