const CONFIGURED_BASE = import.meta.env.VITE_API_BASE_URL as string | undefined;
const BASE =
  CONFIGURED_BASE || (typeof window === "undefined" ? "http://127.0.0.1:3000/api" : "/api");

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

type Options = {
  query?: Record<string, string | number | boolean | undefined | null>;
  body?: unknown;
};

export function apiUrl(path: string, query?: Options["query"]): string {
  const base = BASE.replace(/\/$/, "");
  if (/^https?:\/\//.test(base)) {
    const url = new URL(`${base}${path}`);
    if (query) {
      for (const [key, value] of Object.entries(query)) {
        if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
      }
    }
    return url.toString();
  }
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost";
  const url = new URL(base + path, origin);
  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null) url.searchParams.set(key, String(value));
    }
  }
  return url.toString();
}

async function parse<T>(res: Response): Promise<T> {
  const json = await res.json().catch(() => null);
  if (res.ok && json?.success !== false) return (json?.data ?? json) as T;
  const err = json?.error ?? {};
  throw new ApiError(err.code ?? "UNKNOWN", err.message ?? res.statusText, res.status);
}

async function request<T>(method: string, path: string, opts: Options = {}): Promise<T> {
  const headers: Record<string, string> = { "x-language": "vi" };
  if (opts.body !== undefined) headers["Content-Type"] = "application/json";
  const res = await fetch(apiUrl(path, opts.query), {
    method,
    headers,
    body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
  });
  return parse<T>(res);
}

export type Page<T> = { items: T[]; meta: { page?: number; pageSize?: number; total?: number } };

async function getPage<T>(path: string, opts: Options = {}): Promise<Page<T>> {
  const headers: Record<string, string> = { "x-language": "vi" };
  const res = await fetch(apiUrl(path, opts.query), { headers });
  const json = await res.json().catch(() => null);
  if (res.ok && json?.success !== false) {
    return { items: (json?.data ?? []) as T[], meta: json?.meta ?? {} };
  }
  const err = json?.error ?? {};
  throw new ApiError(err.code ?? "UNKNOWN", err.message ?? res.statusText, res.status);
}

export const api = {
  get: <T>(path: string, opts?: Options) => request<T>("GET", path, opts),
  getPage,
  post: <T>(path: string, body?: unknown) => request<T>("POST", path, { body }),
};
