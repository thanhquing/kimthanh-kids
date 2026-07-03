import { api } from "./http";

/** 1 trường trả về từ /public/tenants — chỉ field an toàn để chọn ở login. */
export type TenantOption = {
  id: string;
  code: string | null;
  slug: string;
  displayName: string;
  logoUrl: string | null;
  primaryDomain: string | null;
};

/** Toàn bộ danh sách trường (không q) — dùng để hiển thị ngay khi mở màn login. */
export function listTenants(): Promise<TenantOption[]> {
  return api.get<TenantOption[]>("/public/tenants", { auth: false });
}

/** Search trường theo tên/mã/MST. q < 2 ký tự → API trả []. */
export function searchTenants(q: string): Promise<TenantOption[]> {
  return api.get<TenantOption[]>("/public/tenants", { query: { q }, auth: false });
}
