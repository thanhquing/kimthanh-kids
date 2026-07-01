// Ánh xạ enum người dùng/học sinh → khóa i18n + class badge (dùng chung các màn Hồ sơ).
import type { GuardianLink, StudentStatus, TenantRole } from "@/api/crm";
import type { TKey } from "@/i18n";

export const GENDER_KEY: Record<string, TKey> = {
  MALE: "gender.MALE",
  FEMALE: "gender.FEMALE",
  OTHER: "gender.OTHER",
};

export const STUDENT_STATUS: Record<StudentStatus, { key: TKey; badge: string }> = {
  ACTIVE: { key: "studentStatus.ACTIVE", badge: "b-green" },
  INACTIVE: { key: "studentStatus.INACTIVE", badge: "b-amber" },
  GRADUATED: { key: "studentStatus.GRADUATED", badge: "b-blue" },
  WITHDRAWN: { key: "studentStatus.WITHDRAWN", badge: "b-slate" },
};

export const ROLE: Record<TenantRole, { key: TKey; badge: string }> = {
  SCHOOL_ADMIN: { key: "roles.SCHOOL_ADMIN", badge: "b-blue" },
  PRINCIPAL: { key: "roles.PRINCIPAL", badge: "b-blue" },
  TEACHER: { key: "roles.TEACHER", badge: "b-peach" },
  NURSE: { key: "roles.NURSE", badge: "b-green" },
  FINANCE: { key: "roles.FINANCE", badge: "b-amber" },
  PARENT: { key: "roles.PARENT", badge: "b-slate" },
};

/** Tóm tắt phụ huynh kiểu "Mẹ Lan, Ba Tuấn" — đại diện chính đứng trước. */
export function guardiansSummary(parents?: GuardianLink[]): string {
  if (!parents?.length) return "";
  const sorted = [...parents].sort((a, b) => Number(b.isPrimary) - Number(a.isPrimary));
  return sorted
    .map((p) => {
      const shortName = p.parent.fullName.trim().split(/\s+/).pop() ?? p.parent.fullName;
      return `${p.relationship} ${shortName}`.trim();
    })
    .join(", ");
}
