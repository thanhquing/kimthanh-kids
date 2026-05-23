/**
 * Canonical role + status enums shared across api, web, mobile.
 * Values are stored in DB as strings, so keep them stable.
 */

export enum UserRole {
  SUPER_ADMIN = 'SUPER_ADMIN',
  ADMIN = 'ADMIN',
  FINANCE = 'FINANCE',
  NURSE = 'NURSE',
  TEACHER = 'TEACHER',
  PARENT = 'PARENT',
}

export enum UserStatus {
  ACTIVE = 'ACTIVE',
  INACTIVE = 'INACTIVE',
  SUSPENDED = 'SUSPENDED',
  PENDING = 'PENDING',
}

export enum Gender {
  MALE = 'MALE',
  FEMALE = 'FEMALE',
  OTHER = 'OTHER',
}

export enum AttendanceStatus {
  PRESENT = 'PRESENT',
  ABSENT = 'ABSENT',
  LATE = 'LATE',
  EXCUSED = 'EXCUSED',
}

export enum MedicineRequestStatus {
  PENDING = 'PENDING',
  APPROVED = 'APPROVED',
  REJECTED = 'REJECTED',
  ADMINISTERED = 'ADMINISTERED',
  CANCELLED = 'CANCELLED',
}

export enum PaymentStatus {
  PENDING = 'PENDING',
  PAID = 'PAID',
  OVERDUE = 'OVERDUE',
  REFUNDED = 'REFUNDED',
  CANCELLED = 'CANCELLED',
}

export enum AnnouncementAudience {
  ALL = 'ALL',
  PARENTS = 'PARENTS',
  TEACHERS = 'TEACHERS',
  STAFF = 'STAFF',
  CLASS = 'CLASS',
}

export enum MediaType {
  IMAGE = 'IMAGE',
  VIDEO = 'VIDEO',
  DOCUMENT = 'DOCUMENT',
}

export enum Locale {
  VI = 'vi',
  EN = 'en',
}
