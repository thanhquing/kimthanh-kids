import { z } from 'zod';

import {
  AnnouncementAudience,
  AttendanceStatus,
  Gender,
  Locale,
  MedicineRequestStatus,
  UserRole,
  UserStatus,
} from '@kimthanh/shared-types';

/** Reusable scalar schemas. */
export const idSchema = z.string().uuid();
export const emailSchema = z.string().email().toLowerCase();
export const phoneSchema = z
  .string()
  .min(8)
  .max(20)
  .regex(/^[+0-9\s-]+$/);
export const passwordSchema = z
  .string()
  .min(8, 'validation.password.min')
  .max(72, 'validation.password.max')
  .regex(/[A-Z]/, 'validation.password.uppercase')
  .regex(/[a-z]/, 'validation.password.lowercase')
  .regex(/[0-9]/, 'validation.password.number');

/** Auth */
export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'validation.password.required'),
});

export const registerSchema = z.object({
  email: emailSchema,
  password: passwordSchema,
  fullName: z.string().min(2).max(120),
  phone: phoneSchema.optional(),
  role: z.nativeEnum(UserRole).optional(),
});

export const refreshTokenSchema = z.object({
  refreshToken: z.string().min(20),
});

/** User */
export const updateUserSchema = z.object({
  fullName: z.string().min(2).max(120).optional(),
  phone: phoneSchema.optional(),
  avatarUrl: z.string().url().optional(),
  locale: z.nativeEnum(Locale).optional(),
});

export const userStatusSchema = z.nativeEnum(UserStatus);
export const userRoleSchema = z.nativeEnum(UserRole);

/** Student */
export const createStudentSchema = z.object({
  schoolId: idSchema,
  classroomId: idSchema.optional(),
  fullName: z.string().min(2).max(120),
  nickname: z.string().max(60).optional(),
  dateOfBirth: z.string().date(),
  gender: z.nativeEnum(Gender),
  parentIds: z.array(idSchema).min(1),
});

/** Attendance */
export const markAttendanceSchema = z.object({
  studentId: idSchema,
  classroomId: idSchema,
  date: z.string().date(),
  status: z.nativeEnum(AttendanceStatus),
  checkInAt: z.string().datetime().optional(),
  checkOutAt: z.string().datetime().optional(),
  note: z.string().max(500).optional(),
});

/** Reports */
export const createDailyReportSchema = z.object({
  studentId: idSchema,
  classroomId: idSchema,
  date: z.string().date(),
  mood: z.string().max(120).optional(),
  meals: z.string().max(500).optional(),
  nap: z.string().max(120).optional(),
  activities: z.string().max(1000).optional(),
  note: z.string().max(1000).optional(),
  mediaIds: z.array(idSchema).optional(),
});

/** Health */
export const createMedicineRequestSchema = z.object({
  studentId: idSchema,
  medicineName: z.string().min(1).max(120),
  dosage: z.string().min(1).max(120),
  schedule: z.string().min(1).max(200),
  startDate: z.string().date(),
  endDate: z.string().date(),
  reason: z.string().max(500).optional(),
});

export const medicineRequestStatusSchema = z.nativeEnum(MedicineRequestStatus);

/** Announcements */
export const createAnnouncementSchema = z.object({
  title: z.string().min(2).max(200),
  body: z.string().min(2).max(5000),
  audience: z.nativeEnum(AnnouncementAudience),
  classroomId: idSchema.optional(),
  publishedAt: z.string().datetime().optional(),
});

/** Pagination */
export const paginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export type PaginationQueryInput = z.infer<typeof paginationQuerySchema>;
