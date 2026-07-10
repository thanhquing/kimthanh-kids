// Gate nav + landing CRM theo role. Nhóm role khớp @Roles BE (kids-api controllers) → user
// không thấy/không đáp vào trang sẽ bị 403. Nguồn sự thật role dùng chung (AppLayout + App router).
import type { TenantRole } from "@/api/crm";

export const ADMIN_ROLES: TenantRole[] = ["SCHOOL_ADMIN", "PRINCIPAL"]; // dashboard/members/audit/settings (@Roles cấp class)
export const NON_FINANCE_ROLES: TenantRole[] = ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER", "NURSE"]; // health/pickup (STAFF loại FINANCE)
export const LESSON_EDITOR_ROLES: TenantRole[] = ["SCHOOL_ADMIN", "PRINCIPAL", "TEACHER"]; // lesson-plans EDITORS

/** Hiện khi không giới hạn (allowed rỗng) HOẶC user có ≥1 role khớp. */
export function hasAnyRole(userRoles: TenantRole[], allowed?: TenantRole[]): boolean {
  return !allowed || allowed.some((r) => userRoles.includes(r));
}

export function isAdminRole(userRoles: TenantRole[]): boolean {
  return userRoles.some((r) => ADMIN_ROLES.includes(r));
}
