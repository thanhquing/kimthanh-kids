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

/** Search trường để chọn ở login (theo tên/mã trường/MST). q < 2 ký tự → API trả []. */
export function searchTenants(q: string): Promise<TenantOption[]> {
  return api.get<TenantOption[]>("/public/tenants", { query: { q }, auth: false });
}
