import * as SecureStore from "expo-secure-store";
import { createMMKV } from "react-native-mmkv";

const BASE = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:3000/api";
const ACCESS_KEY = "kk_mn_access";
const REFRESH_KEY = "kk_mn_refresh";
const LANGUAGE_KEY = "kk_mn_lang";
const TENANT_KEY = "kk_mn_tenant";

export const appStorage = createMMKV({ id: "kimthanh-kids-mobile" });

let accessTokenCache: string | null = null;
let refreshTokenCache: string | null = null;
let tokenHydrated = false;

async function hydrateTokens() {
  if (tokenHydrated) return;
  const [access, refresh] = await Promise.all([
    SecureStore.getItemAsync(ACCESS_KEY),
    SecureStore.getItemAsync(REFRESH_KEY),
  ]);
  accessTokenCache = access;
  refreshTokenCache = refresh;
  tokenHydrated = true;
}

/**
 * Tenant đã chọn ở màn login (độc lập subdomain). Lưu để gắn header `x-tenant` cho mọi request:
 * cần lúc login (server chưa có token để biết trường); sau login token đã mang tenantId nên header
 * chỉ bổ trợ (TenantGuard vẫn chặn nếu lệch token).
 */
export const tenantStore = {
  get id() {
    return appStorage.getString(TENANT_KEY) ?? null;
  },
  set(id: string) {
    appStorage.set(TENANT_KEY, id);
  },
  clear() {
    appStorage.remove(TENANT_KEY);
  },
};

const ROLE_KEY = "kk_mn_role";

/** Role đã xác định sau login — lưu để redirect đúng khi mở lại app. */
export const roleStore = {
  get(): "parent" | "teacher" | null {
    const v = appStorage.getString(ROLE_KEY);
    return v === "parent" || v === "teacher" ? v : null;
  },
  set(role: "parent" | "teacher") {
    appStorage.set(ROLE_KEY, role);
  },
  clear() {
    appStorage.remove(ROLE_KEY);
  },
};

export const tokenStore = {
  async getAccess() {
    await hydrateTokens();
    return accessTokenCache;
  },
  async getRefresh() {
    await hydrateTokens();
    return refreshTokenCache;
  },
  hasSession() {
    return !!accessTokenCache;
  },
  async hydrate() {
    await hydrateTokens();
    return !!accessTokenCache;
  },
  async set(access: string, refresh?: string) {
    accessTokenCache = access;
    await SecureStore.setItemAsync(ACCESS_KEY, access);
    if (refresh) {
      refreshTokenCache = refresh;
      await SecureStore.setItemAsync(REFRESH_KEY, refresh);
    }
    tokenHydrated = true;
  },
  async clear() {
    accessTokenCache = null;
    refreshTokenCache = null;
    tokenHydrated = true;
    await Promise.all([
      SecureStore.deleteItemAsync(ACCESS_KEY),
      SecureStore.deleteItemAsync(REFRESH_KEY),
    ]);
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
  const url = new URL(`${BASE}${path}`);
  if (query) {
    for (const [k, v] of Object.entries(query)) {
      if (v !== undefined && v !== null) url.searchParams.set(k, String(v));
    }
  }
  return url.toString();
}

async function raw(method: string, path: string, opts: Options, token: string | null) {
  const headers: Record<string, string> = {
    "x-language": appStorage.getString(LANGUAGE_KEY) === "en" ? "en" : "vi",
  };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  if (opts.auth !== false && token) headers["Authorization"] = `Bearer ${token}`;
  const tenantId = appStorage.getString(TENANT_KEY);
  if (tenantId) headers["x-tenant"] = tenantId;
  return fetch(buildUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
}

async function refreshTokens(): Promise<boolean> {
  const refresh = await tokenStore.getRefresh();
  if (!refresh) return false;
  const res = await raw("POST", "/auth/refresh", { body: { refreshToken: refresh }, auth: false }, null);
  if (!res.ok) return false;
  const json = await res.json().catch(() => null);
  const data = json?.data ?? json;
  if (data?.accessToken) {
    await tokenStore.set(data.accessToken, data.refreshToken);
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
  let res = await raw(method, path, opts, await tokenStore.getAccess());
  if (res.status === 401 && opts.auth !== false) {
    if (await refreshTokens()) {
      res = await raw(method, path, opts, await tokenStore.getAccess());
    } else {
      await tokenStore.clear();
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
