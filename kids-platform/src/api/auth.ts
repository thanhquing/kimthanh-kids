import { api, tokenStore } from "./http";

export type LoginInput = { identifier: string; password: string };
export type LoginResult = { accessToken: string; refreshToken: string; userId: string };
export type Me = {
  id: string;
  email?: string;
  fullName?: string;
  platformRole?: string | null;
  tenantId?: string | null;
};

export async function login(input: LoginInput): Promise<LoginResult> {
  const res = await api.post<LoginResult>("/auth/login", input, { auth: false });
  tokenStore.set(res.accessToken, res.refreshToken);
  return res;
}

export function me(): Promise<Me> {
  return api.get<Me>("/auth/me");
}

export async function logout(): Promise<void> {
  const refreshToken = tokenStore.refresh;
  try {
    if (refreshToken) await api.post("/auth/logout", { refreshToken });
  } finally {
    tokenStore.clear();
  }
}

export function isAuthed(): boolean {
  return !!tokenStore.access;
}
