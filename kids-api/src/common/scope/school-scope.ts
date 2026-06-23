import { ForbiddenException } from "@nestjs/common";
import { TenantRole } from "@prisma/client";
import { AuthUser } from "../decorators/current-user.decorator";

const STAFF_ROLES = new Set<TenantRole>([
  TenantRole.SCHOOL_ADMIN,
  TenantRole.PRINCIPAL,
  TenantRole.TEACHER,
  TenantRole.NURSE,
  TenantRole.FINANCE,
]);

/** true nếu user là nhân sự trường (không phải PARENT). */
export function isStaff(user: AuthUser): boolean {
  return user.roles.some((r) => STAFF_ROLES.has(r));
}

/**
 * Scope theo cơ sở (school) BÊN TRONG tenant.
 * - allowedSchoolIds = null → role toàn tenant (SCHOOL_ADMIN/PRINCIPAL chuỗi) → thấy mọi school.
 * - allowedSchoolIds = [...] → chỉ thấy các school đó (TEACHER/NURSE).
 *
 * Tenant isolation đã do Prisma extension lo; đây chỉ thêm ràng buộc school.
 */
export function schoolWhere(user: AuthUser): { schoolId?: { in: string[] } } {
  if (user.allowedSchoolIds === null) return {};
  return { schoolId: { in: user.allowedSchoolIds } };
}

/** Ném 403 nếu user không được phép thao tác trên school này. */
export function assertSchoolAccess(user: AuthUser, schoolId: string): void {
  if (user.allowedSchoolIds === null) return;
  if (!user.allowedSchoolIds.includes(schoolId)) {
    throw new ForbiddenException({
      code: "SCHOOL_FORBIDDEN",
      message: "Bạn không có quyền trên cơ sở này",
    });
  }
}

/** ID cơ sở mặc định khi user chỉ thuộc 1 school (tiện cho create). */
export function defaultSchoolId(user: AuthUser): string | null {
  if (user.allowedSchoolIds && user.allowedSchoolIds.length === 1) return user.allowedSchoolIds[0];
  return null;
}

/**
 * WHERE-fragment đọc bản ghi domain (có cột `schoolId` + quan hệ `student`) theo quyền xem:
 * - staff → school-scope (`schoolWhere`).
 * - phụ huynh → chỉ bản ghi của con mình.
 */
export function recordScopeWhere(user: AuthUser): object {
  return isStaff(user)
    ? schoolWhere(user)
    : { student: { parents: { some: { parentId: user.id } } } };
}

/**
 * WHERE để tìm 1 học sinh mà user được phép thao tác:
 * - staff → trong school-scope.
 * - phụ huynh → phải là con mình.
 */
export function ownedStudentWhere(user: AuthUser, studentId: string): object {
  return isStaff(user)
    ? { id: studentId, ...schoolWhere(user) }
    : { id: studentId, parents: { some: { parentId: user.id } } };
}

/**
 * OR-fragment cho nội dung phụ huynh xem được (menu/album): bản ghi toàn trường
 * (`classroomId: null`) của trường con đang học, hoặc bản ghi gắn với lớp của con.
 * Dùng chung cho menus/albums để tránh lặp.
 */
export function contentScopeForKids(
  kids: { schoolId: string; classroomId: string | null }[],
): object {
  const schoolIds = [...new Set(kids.map((k) => k.schoolId))];
  const classroomIds = kids.map((k) => k.classroomId).filter((c): c is string => !!c);
  return {
    OR: [{ classroomId: null, schoolId: { in: schoolIds } }, { classroomId: { in: classroomIds } }],
  };
}
