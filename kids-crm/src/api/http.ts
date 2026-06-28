/**
 * Lớp HTTP dùng chung cho kids-crm.
 *
 * Xử lý tập trung hợp đồng API của kids-api:
 *  - base URL `/api` (dev: Vite proxy gắn Host=TENANT_HOST; prod: nginx → kids-api)
 *  - bóc envelope `{ success, data }`; lỗi → ném ApiError(code, message)
 *  - gắn Authorization: Bearer
 *  - 401 → thử refresh 1 lần → retry → nếu vẫn hỏng thì logout
 */
const BASE = "/api";
const ACCESS_KEY = "kk_crm_access";
const REFRESH_KEY = "kk_crm_refresh";
const LANGUAGE_KEY = "kk_crm_lang";
const TENANT_KEY = "kk_crm_tenant";

/**
 * Tenant đã chọn ở màn login (độc lập subdomain). Lưu để gắn header `x-tenant` cho mọi request:
 * cần thiết lúc login (server chưa có token để biết trường); sau login token đã mang tenantId nên
 * header chỉ là bổ trợ (TenantGuard vẫn chặn nếu lệch token).
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

export const tokenStore = {
  get access() {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh() {
    return localStorage.getItem(REFRESH_KEY);
  },
  set(access: string, refresh?: string) {
    localStorage.setItem(ACCESS_KEY, access);
    if (refresh) localStorage.setItem(REFRESH_KEY, refresh);
  },
  clear() {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
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
  const headers: Record<string, string> = { "x-language": localStorage.getItem(LANGUAGE_KEY) === "en" ? "en" : "vi" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && token) headers["Authorization"] = `Bearer ${token}`;
  const tenantId = localStorage.getItem(TENANT_KEY);
  if (tenantId) headers["x-tenant"] = tenantId;
  return fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function refreshTokens(): Promise<boolean> {
  const refresh = tokenStore.refresh;
  if (!refresh) return false;
  const res = await raw("POST", "/auth/refresh", { body: { refreshToken: refresh }, auth: false }, null);
  if (!res.ok) return false;
  const json = await res.json().catch(() => null);
  const data = json?.data ?? json;
  if (data?.accessToken) {
    tokenStore.set(data.accessToken, data.refreshToken);
    return true;
  }
  return false;
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
