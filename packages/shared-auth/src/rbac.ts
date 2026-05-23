import { UserRole } from '@kimthanh/shared-types';

/**
 * Permission catalog — kept as flat string constants so it can be referenced
 * from both backend guards and frontend conditionals without circular deps.
 */
export const Permissions = {
  // Students
  STUDENT_READ: 'student:read',
  STUDENT_WRITE: 'student:write',
  STUDENT_DELETE: 'student:delete',

  // Attendance
  ATTENDANCE_READ: 'attendance:read',
  ATTENDANCE_WRITE: 'attendance:write',

  // Reports
  REPORT_READ: 'report:read',
  REPORT_WRITE: 'report:write',

  // Health
  HEALTH_READ: 'health:read',
  HEALTH_WRITE: 'health:write',
  MEDICINE_APPROVE: 'health:medicine:approve',

  // Finance
  INVOICE_READ: 'finance:invoice:read',
  INVOICE_WRITE: 'finance:invoice:write',
  PAYMENT_RECORD: 'finance:payment:record',

  // Announcements
  ANNOUNCEMENT_READ: 'announcement:read',
  ANNOUNCEMENT_WRITE: 'announcement:write',

  // Users / school
  USER_MANAGE: 'user:manage',
  SCHOOL_MANAGE: 'school:manage',
} as const;

export type Permission = (typeof Permissions)[keyof typeof Permissions];

export const ROLE_PERMISSIONS: Record<UserRole, ReadonlyArray<Permission>> = {
  [UserRole.SUPER_ADMIN]: Object.values(Permissions),
  [UserRole.ADMIN]: [
    Permissions.STUDENT_READ,
    Permissions.STUDENT_WRITE,
    Permissions.STUDENT_DELETE,
    Permissions.ATTENDANCE_READ,
    Permissions.ATTENDANCE_WRITE,
    Permissions.REPORT_READ,
    Permissions.REPORT_WRITE,
    Permissions.HEALTH_READ,
    Permissions.INVOICE_READ,
    Permissions.INVOICE_WRITE,
    Permissions.ANNOUNCEMENT_READ,
    Permissions.ANNOUNCEMENT_WRITE,
    Permissions.USER_MANAGE,
    Permissions.SCHOOL_MANAGE,
  ],
  [UserRole.FINANCE]: [
    Permissions.STUDENT_READ,
    Permissions.INVOICE_READ,
    Permissions.INVOICE_WRITE,
    Permissions.PAYMENT_RECORD,
  ],
  [UserRole.NURSE]: [
    Permissions.STUDENT_READ,
    Permissions.HEALTH_READ,
    Permissions.HEALTH_WRITE,
    Permissions.MEDICINE_APPROVE,
  ],
  [UserRole.TEACHER]: [
    Permissions.STUDENT_READ,
    Permissions.ATTENDANCE_READ,
    Permissions.ATTENDANCE_WRITE,
    Permissions.REPORT_READ,
    Permissions.REPORT_WRITE,
    Permissions.ANNOUNCEMENT_READ,
  ],
  [UserRole.PARENT]: [
    Permissions.STUDENT_READ,
    Permissions.ATTENDANCE_READ,
    Permissions.REPORT_READ,
    Permissions.INVOICE_READ,
    Permissions.ANNOUNCEMENT_READ,
  ],
};

export const hasPermission = (role: UserRole, permission: Permission): boolean =>
  ROLE_PERMISSIONS[role].includes(permission);

export const hasAnyPermission = (
  role: UserRole,
  permissions: ReadonlyArray<Permission>,
): boolean => permissions.some((p) => hasPermission(role, p));
