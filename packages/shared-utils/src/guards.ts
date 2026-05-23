import { UserRole, type ApiResponse, type ApiSuccess } from '@kimthanh/shared-types';

export const isApiSuccess = <T>(response: ApiResponse<T>): response is ApiSuccess<T> =>
  response.success === true;

export const STAFF_ROLES: ReadonlyArray<UserRole> = [
  UserRole.SUPER_ADMIN,
  UserRole.ADMIN,
  UserRole.FINANCE,
  UserRole.NURSE,
  UserRole.TEACHER,
];

export const isStaff = (role: UserRole): boolean => STAFF_ROLES.includes(role);
export const isParent = (role: UserRole): boolean => role === UserRole.PARENT;
export const isAdmin = (role: UserRole): boolean =>
  role === UserRole.ADMIN || role === UserRole.SUPER_ADMIN;
