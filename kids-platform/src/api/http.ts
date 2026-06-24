/**
 * Lớp HTTP dùng chung — FILE MẪU để kids-crm / mobile copy (chỉnh token store + host).
 *
 * Xử lý tập trung hợp đồng API của kids-api:
 *  - base URL `/api` (dev: Vite proxy gắn Host=PLATFORM_HOST; prod: nginx → kids-api)
 *  - bóc envelope `{ success, data }`; lỗi → ném ApiError(code, message)
 *  - gắn Authorization: Bearer
 *  - 401 → thử refresh 1 lần → retry → nếu vẫn hỏng thì logout
 */
const BASE = "/api";
const ACCESS_KEY = "kk_access";
const REFRESH_KEY = "kk_refresh";

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
  const headers: Record<string, string> = {};
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && token) headers["Authorization"] = `Bearer ${token}`;
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

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  let res = await raw(method, path, opts, tokenStore.access);
  if (res.status === 401 && opts.auth !== false) {
    if (await refreshTokens()) {
      res = await raw(method, path, opts, tokenStore.access);
    } else {
      tokenStore.clear();
      onUnauthorized?.();
    }
  }
  return parse<T>(res);
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>("GET", path, opts ?? {}),
  post: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>("POST", path, { ...opts, body }),
  patch: <T>(path: string, body?: unknown, opts?: Options) =>
    request<T>("PATCH", path, { ...opts, body }),
  delete: <T>(path: string, opts?: Options) => request<T>("DELETE", path, opts ?? {}),
};
