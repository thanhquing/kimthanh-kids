import { useQuery } from "@tanstack/react-query";
import { api, tenantStore, tokenStore } from "./http";
import type { Role } from "@/lib/routes";

/** Đăng nhập bằng số điện thoại (hoặc email) — kids-api nhận `identifier`. */
export type LoginInput = { identifier: string; password: string };
// refreshToken KHÔNG còn ở body — server đặt trong cookie HttpOnly.
export type LoginResult = { accessToken: string; userId: string };

/** Vai trò tenant trả về từ /auth/me (Prisma enum TenantRole). */
export type TenantRole = "SCHOOL_ADMIN" | "PRINCIPAL" | "TEACHER" | "NURSE" | "FINANCE" | "PARENT";
export type Me = {
  id: string;
  type: "PLATFORM" | "TENANT";
  tenantId?: string | null;
  platformRole?: string | null;
  fullName?: string | null;
  phone?: string | null;
  roles: TenantRole[];
  allowedSchoolIds?: string[] | null;
};

export async function login(input: LoginInput, tenantId: string): Promise<LoginResult> {
  // Lưu tenant đã chọn TRƯỚC khi gọi: http gắn header x-tenant cho /auth/login (và các request sau).
  tenantStore.set(tenantId);
  try {
    const res = await api.post<LoginResult>("/auth/login", input, { auth: false });
    tokenStore.set(res.accessToken);
    return res;
  } catch (err) {
    tenantStore.clear(); // login hỏng → bỏ tenant để không “dính” trường sai
    throw err;
  }
}

export function me(): Promise<Me> {
  return api.get<Me>("/auth/me");
}

export const meKeys = { me: ["auth", "me"] as const };

/** Hồ sơ người đăng nhập — dùng cho ProfilePage + greeting + guard role. */
export function useMe() {
  return useQuery({
    queryKey: meKeys.me,
    queryFn: me,
    enabled: isAuthed(),
    staleTime: 5 * 60_000,
  });
}

export async function logout(): Promise<void> {
  try {
    // Không gửi body — server đọc refresh từ cookie rồi revoke + xóa cookie.
    await api.post("/auth/logout");
  } catch {
    // best-effort: kể cả logout server lỗi vẫn dọn phiên phía client
  } finally {
    tokenStore.clear();
    tenantStore.clear();
  }
}

export function isAuthed(): boolean {
  return !!tokenStore.access;
}

/**
 * Map vai trò tenant → app mobile (chỉ phục vụ phụ huynh & giáo viên).
 * Giáo viên/hiệu trưởng → "teacher"; phụ huynh → "parent"; vai trò khác (admin/kế toán/y tá)
 * dùng console/CRM nên trả null → màn login báo không hỗ trợ.
 */
export function roleForMobile(roles: TenantRole[]): Role | null {
  if (roles.includes("TEACHER") || roles.includes("PRINCIPAL")) return "teacher";
  if (roles.includes("PARENT")) return "parent";
  return null;
}
