import { api, tokenStore } from "./http";

export type LoginInput = { identifier: string; password: string };
// refreshToken KHÔNG còn ở body — server đặt trong cookie HttpOnly.
export type LoginResult = { accessToken: string; userId: string };
export type Me = {
  id: string;
  email?: string;
  fullName?: string;
  platformRole?: string | null;
  tenantId?: string | null;
};

export async function login(input: LoginInput): Promise<LoginResult> {
  const res = await api.post<LoginResult>("/auth/login", input, { auth: false });
  tokenStore.set(res.accessToken);
  return res;
}

export function me(): Promise<Me> {
  return api.get<Me>("/auth/me");
}

export async function logout(): Promise<void> {
  try {
    // Không gửi body — server đọc refresh từ cookie rồi revoke + xóa cookie.
    await api.post("/auth/logout");
  } catch {
    // best-effort: kể cả logout server lỗi vẫn dọn phiên phía client
  } finally {
    tokenStore.clear();
  }
}

export function isAuthed(): boolean {
  return !!tokenStore.access;
}
