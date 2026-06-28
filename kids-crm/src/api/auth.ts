import { api, tenantStore, tokenStore } from "./http";

export type LoginInput = { identifier: string; password: string };
export type LoginResult = { accessToken: string; refreshToken: string; userId: string };
export type Me = {
  id: string;
  type?: "PLATFORM" | "TENANT";
  platformRole?: string | null;
  tenantId?: string | null;
  roles?: string[];
  allowedSchoolIds?: string[] | null;
};

export async function login(input: LoginInput, tenantId: string): Promise<LoginResult> {
  // Lưu tenant đã chọn TRƯỚC khi gọi: http sẽ gắn header x-tenant cho cả /auth/login lẫn /auth/me.
  tenantStore.set(tenantId);
  try {
    const res = await api.post<LoginResult>("/auth/login", input, { auth: false });
    tokenStore.set(res.accessToken, res.refreshToken);
    const profile = await me();
    if (profile.type !== "TENANT" || !profile.tenantId || profile.platformRole) {
      tokenStore.clear();
      throw new Error("CRM chỉ dành cho tài khoản nhà trường.");
    }
    return res;
  } catch (err) {
    tenantStore.clear(); // login hỏng → bỏ tenant để không “dính” trường sai ở lần sau
    throw err;
  }
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
    tenantStore.clear();
  }
}

export function isAuthed(): boolean {
  return !!tokenStore.access;
}
