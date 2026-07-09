import { api } from "./http";

export type { Page } from "./http";
/** Tham số phân trang gửi lên server (khớp common/http/pagination của kids-api). */
export type PageParams = { page?: number; pageSize?: number };

export type DashboardSummary = {
  students: number;
  classrooms: number;
  staff: number;
  attendanceToday: Record<string, number>;
  pendingMedicine: number;
  pendingLeave: number;
  outstandingInvoices: number;
  overdueInvoices?: number;
  outstandingAmount: number;
  revenueThisMonth: number;
  attendanceTrend30d?: { date: string; present: number }[];
  medicineThisMonth?: Record<string, number>;
  medicineTotalThisMonth?: number;
  revenueLast6Months?: { period: string; month: string; amount: number }[];
  recentAnnouncements?: {
    id: string;
    title: string;
    audience: string;
    classroomName?: string | null;
    publishedAt?: string | null;
  }[];
};

// ──────────────────────────────────────────────────────────────────────────
// Hồ sơ: trường (school), lớp học, học sinh, nhân sự — khớp controller kids-api.
// ──────────────────────────────────────────────────────────────────────────

export type School = {
  id: string;
  name: string;
  code: string;
  address?: string | null;
  phone?: string | null;
  createdAt: string;
};

export type TeacherRef = { id: string; fullName: string };

export type Classroom = {
  id: string;
  schoolId: string;
  name: string;
  ageGroup?: string | null;
  capacity: number;
  isActive: boolean;
  homeroomTeacherId?: string | null;
  homeroomTeacher?: TeacherRef | null;
  _count?: { students: number };
};
export type CreateClassroom = {
  schoolId: string;
  name: string;
  ageGroup?: string;
  capacity?: number;
  homeroomTeacherId?: string;
};
export type UpdateClassroom = {
  name?: string;
  ageGroup?: string;
  capacity?: number;
  homeroomTeacherId?: string | null;
  isActive?: boolean;
};

export type Gender = "MALE" | "FEMALE" | "OTHER";
export type StudentStatus = "ACTIVE" | "INACTIVE" | "GRADUATED" | "WITHDRAWN";
export type ClassroomRef = { id: string; name: string };
export type GuardianLink = {
  relationship: string;
  isPrimary: boolean;
  parent: { id: string; fullName: string; phone?: string | null; email?: string | null };
};
export type Student = {
  id: string;
  fullName: string;
  nickname?: string | null;
  dateOfBirth: string;
  gender: Gender;
  status: StudentStatus;
  avatarUrl?: string | null;
  classroomId?: string | null;
  classroom?: ClassroomRef | null;
  parents?: GuardianLink[];
};
export type CreateStudent = {
  schoolId: string;
  classroomId?: string;
  fullName: string;
  nickname?: string;
  dateOfBirth: string;
  gender: Gender;
  guardians?: { parentId: string; relationship: string; isPrimary?: boolean }[];
};
export type UpdateStudent = {
  classroomId?: string | null;
  fullName?: string;
  nickname?: string;
  dateOfBirth?: string;
  gender?: Gender;
  status?: StudentStatus;
};

export type TenantRole = "SCHOOL_ADMIN" | "PRINCIPAL" | "TEACHER" | "NURSE" | "FINANCE" | "PARENT";
export type Shift = "MORNING" | "AFTERNOON" | "FULL_DAY";
export type Member = {
  id: string; // membership id
  role: TenantRole;
  schoolId?: string | null;
  isActive: boolean;
  createdAt: string;
  user: { id: string; email?: string | null; phone?: string | null; fullName: string; isActive: boolean };
  school?: School | null;
};
export type CreateMember = {
  fullName: string;
  role: TenantRole;
  phone?: string;
  email?: string;
  password: string;
  schoolId?: string | null;
};

export const crm = {
  dashboard: () => api.get<DashboardSummary>("/dashboard/summary"),

  schools: () => api.get<School[]>("/tenant/schools"),

  classrooms: {
    list: (schoolId?: string) => api.get<Classroom[]>("/classrooms", { query: { schoolId } }),
    page: (opts: { schoolId?: string } & PageParams = {}) =>
      api.getPage<Classroom>("/classrooms", { query: opts }),
    get: (id: string) => api.get<Classroom>(`/classrooms/${id}`),
    create: (body: CreateClassroom) => api.post<Classroom>("/classrooms", body),
    update: (id: string, body: UpdateClassroom) => api.patch<Classroom>(`/classrooms/${id}`, body),
    remove: (id: string) => api.delete<{ ok: true }>(`/classrooms/${id}`),
  },

  students: {
    list: (opts: { classroomId?: string; schoolId?: string } = {}) =>
      api.get<Student[]>("/students", { query: opts }),
    page: (
      opts: { classroomId?: string; schoolId?: string; gender?: Gender; search?: string } & PageParams = {},
    ) => api.getPage<Student>("/students", { query: opts }),
    get: (id: string) => api.get<Student>(`/students/${id}`),
    create: (body: CreateStudent) => api.post<Student>("/students", body),
    update: (id: string, body: UpdateStudent) => api.patch<Student>(`/students/${id}`, body),
    remove: (id: string) => api.delete<{ ok: true }>(`/students/${id}`),
    addGuardian: (id: string, body: { parentId: string; relationship: string; isPrimary?: boolean }) =>
      api.post(`/students/${id}/guardians`, body),
    removeGuardian: (id: string, parentId: string) =>
      api.delete(`/students/${id}/guardians/${parentId}`),
  },

  members: {
    list: () => api.get<Member[]>("/tenant/members"),
    page: (
      opts: { search?: string; role?: TenantRole; isActive?: boolean; staffOnly?: boolean } & PageParams = {},
    ) =>
      api.getPage<Member>("/tenant/members", { query: opts }),
    create: (body: CreateMember) => api.post<Member["user"]>("/tenant/members", body),
    setStatus: (userId: string, isActive: boolean) =>
      api.patch<{ id: string; isActive: boolean }>(`/tenant/members/${userId}/status`, { isActive }),
    resetPassword: (userId: string, password: string) =>
      api.patch<{ id: string; passwordReset: true }>(`/tenant/members/${userId}/password`, { password }),
  },

  settings: {
    get: () => api.get<TenantSettings | null>("/tenant/settings"),
    update: (body: UpdateSettings) => api.patch<TenantSettings>("/tenant/settings", body),
  },

  attendance: {
    list: (classroomId: string, date: string) =>
      api.get<AttendanceRow[]>("/attendance", { query: { classroomId, date } }),
    page: (opts: { classroomId: string; date: string } & PageParams) =>
      api.getPage<AttendanceRow>("/attendance", { query: opts }),
    mark: (body: MarkAttendance) => api.post<{ marked: number; skipped: number }>("/attendance/mark", body),
  },

  reports: {
    list: (classroomId: string, date: string) =>
      api.get<DailyReport[]>("/daily-reports", { query: { classroomId, date } }),
    page: (opts: { classroomId: string; date: string } & PageParams) =>
      api.getPage<DailyReport>("/daily-reports", { query: opts }),
    byStudent: (studentId: string) => api.get<DailyReport[]>(`/daily-reports/student/${studentId}`),
    create: (body: CreateReport) => api.post<DailyReport>("/daily-reports", body),
  },

  tuition: {
    list: (opts: { status?: TuitionInvoiceStatus; studentId?: string } = {}) =>
      api.get<Invoice[]>("/tuition/invoices", { query: opts }),
    page: (opts: { status?: TuitionInvoiceStatus; studentId?: string; search?: string } & PageParams = {}) =>
      api.getPage<Invoice>("/tuition/invoices", { query: opts }),
    get: (id: string) => api.get<Invoice>(`/tuition/invoices/${id}`),
    create: (body: CreateInvoice) => api.post<Invoice>("/tuition/invoices", body),
    payManual: (id: string, body: ManualPayment) =>
      api.post<Payment>(`/tuition/invoices/${id}/pay/manual`, body),
    cancel: (id: string) => api.post<Invoice>(`/tuition/invoices/${id}/cancel`),
    vietqr: (id: string) => api.get<VietQrData>(`/tuition/invoices/${id}/vietqr`),
    printHtml: (id: string) => api.getText(`/tuition/invoices/${id}/print`),
  },

  announcements: {
    list: (audience?: AnnouncementAudience) =>
      api.get<Announcement[]>("/announcements", { query: { audience } }),
    page: (opts: { audience?: AnnouncementAudience } & PageParams = {}) =>
      api.getPage<Announcement>("/announcements", { query: opts }),
    get: (id: string) => api.get<Announcement>(`/announcements/${id}`),
    create: (body: CreateAnnouncement) => api.post<Announcement>("/announcements", body),
    publish: (id: string) => api.post<Announcement>(`/announcements/${id}/publish`),
    remove: (id: string) => api.delete<{ ok: true }>(`/announcements/${id}`),
  },

  audit: {
    list: (opts: { action?: string; limit?: number } = {}) =>
      api.get<AuditLog[]>("/audit-logs", { query: opts }),
    page: (opts: { action?: string } & PageParams = {}) =>
      api.getPage<AuditLog>("/audit-logs", { query: opts }),
  },

  medicine: {
    list: (status?: MedicineStatus) => api.get<MedicineRequest[]>("/medicine", { query: { status } }),
    page: (opts: { status?: MedicineStatus } & PageParams = {}) =>
      api.getPage<MedicineRequest>("/medicine", { query: opts }),
    handle: (id: string, body: { status: MedicineStatus; note?: string }) =>
      api.post<MedicineRequest>(`/medicine/${id}/handle`, body),
  },

  incidents: {
    list: (studentId?: string) => api.get<Incident[]>("/incidents", { query: { studentId } }),
    page: (opts: { studentId?: string } & PageParams = {}) =>
      api.getPage<Incident>("/incidents", { query: opts }),
    create: (body: CreateIncident) => api.post<Incident>("/incidents", body),
  },

  health: {
    byStudent: (studentId: string) => api.get<HealthRecord[]>(`/health/student/${studentId}`),
    create: (body: CreateHealthRecord) => api.post<HealthRecord>("/health", body),
  },

  allergies: {
    byStudent: (studentId: string) => api.get<Allergy[]>(`/allergies/student/${studentId}`),
    create: (body: { studentId: string; allergen: string; note?: string }) =>
      api.post<Allergy>("/allergies", body),
    remove: (id: string) => api.delete<{ ok: true }>(`/allergies/${id}`),
  },

  assignments: {
    list: (opts: { staffId?: string; classroomId?: string; weekday?: number } = {}) =>
      api.get<Assignment[]>("/assignments", { query: opts }),
    page: (opts: { staffId?: string; classroomId?: string; weekday?: number } & PageParams = {}) =>
      api.getPage<Assignment>("/assignments", { query: opts }),
    mine: () => api.get<Assignment[]>("/assignments/mine"),
    create: (body: CreateAssignment) => api.post<Assignment>("/assignments", body),
    update: (id: string, body: Partial<CreateAssignment>) => api.patch<Assignment>(`/assignments/${id}`, body),
    remove: (id: string) => api.delete<{ ok: true }>(`/assignments/${id}`),
  },

  leave: {
    list: (status?: LeaveStatus) => api.get<LeaveRequest[]>("/leave", { query: { status } }),
    page: (opts: { status?: LeaveStatus } & PageParams = {}) =>
      api.getPage<LeaveRequest>("/leave", { query: opts }),
    mine: () => api.get<LeaveRequest[]>("/leave/mine"),
    get: (id: string) => api.get<LeaveRequest>(`/leave/${id}`),
    create: (body: CreateLeaveRequest) => api.post<LeaveRequest>("/leave", body),
    decide: (id: string, body: { status: Exclude<LeaveStatus, "PENDING">; note?: string }) =>
      api.post<LeaveRequest>(`/leave/${id}/decide`, body),
  },

  menus: {
    list: (opts: { weekStart?: string; classroomId?: string } = {}) =>
      api.get<WeeklyMenu[]>("/menus", { query: opts }),
    page: (opts: { weekStart?: string; classroomId?: string } & PageParams = {}) =>
      api.getPage<WeeklyMenu>("/menus", { query: opts }),
    get: (id: string) => api.get<WeeklyMenu>(`/menus/${id}`),
    create: (body: CreateWeeklyMenu) => api.post<WeeklyMenu>("/menus", body),
    remove: (id: string) => api.delete<{ ok: true }>(`/menus/${id}`),
    allergyWarnings: (id: string, studentId: string) =>
      api.get<MenuAllergyWarnings>(`/menus/${id}/allergy-warnings`, { query: { studentId } }),
  },

  lessons: {
    list: (opts: { classroomId?: string; week?: string } = {}) =>
      api.get<LessonPlan[]>("/lesson-plans", { query: opts }),
    page: (opts: { classroomId?: string; week?: string } & PageParams = {}) =>
      api.getPage<LessonPlan>("/lesson-plans", { query: opts }),
    get: (id: string) => api.get<LessonPlan>(`/lesson-plans/${id}`),
    create: (body: CreateLessonPlan) => api.post<LessonPlan>("/lesson-plans", body),
    remove: (id: string) => api.delete<{ ok: true }>(`/lesson-plans/${id}`),
  },

  media: {
    uploadImage: (file: File, opts: { kind?: MediaKind; schoolId?: string } = {}) => {
      const form = new FormData();
      form.append("file", file);
      return api.post<UploadedMedia>("/media", form, { query: opts });
    },
  },

  albums: {
    list: (classroomId?: string) => api.get<Album[]>("/albums", { query: { classroomId } }),
    page: (opts: { classroomId?: string } & PageParams = {}) =>
      api.getPage<Album>("/albums", { query: opts }),
    get: (id: string) => api.get<Album>(`/albums/${id}`),
    create: (body: CreateAlbum) => api.post<Album>("/albums", body),
    addPhotos: (id: string, photos: { mediaId: string; caption?: string }[]) =>
      api.post<Album>(`/albums/${id}/photos`, { photos }),
    removePhoto: (photoId: string) => api.delete<{ ok: true }>(`/albums/photos/${photoId}`),
    remove: (id: string) => api.delete<{ ok: true }>(`/albums/${id}`),
  },

  notifications: {
    feed: (unreadOnly?: boolean) =>
      api.get<NotificationItem[]>("/notifications", { query: { unreadOnly } }),
    feedPage: (opts: { unreadOnly?: boolean } & PageParams = {}) =>
      api.getPage<NotificationItem>("/notifications", { query: opts }),
    unreadCount: () => api.get<{ count: number }>("/notifications/unread-count"),
    preferences: () => api.get<NotificationPreference[]>("/notifications/preferences"),
    setPreference: (type: NotificationType, enabled: boolean) =>
      api.patch<NotificationPreference>("/notifications/preferences", { type, enabled }),
    markRead: (id: string) => api.post<NotificationItem>(`/notifications/${id}/read`),
    markAllRead: () => api.post<{ updated: number }>("/notifications/read-all"),
  },

  pickup: {
    authorizations: (opts: { studentId?: string; status?: PickupAuthorizationStatus } = {}) =>
      api.get<PickupAuthorization[]>("/pickup/authorizations", { query: opts }),
    authorizationsPage: (
      opts: { studentId?: string; status?: PickupAuthorizationStatus } & PageParams = {},
    ) => api.getPage<PickupAuthorization>("/pickup/authorizations", { query: opts }),
    logsPage: (opts: { studentId?: string } & PageParams = {}) =>
      api.getPage<PickupLog>("/pickup/logs", { query: opts }),
    createAuthorization: (body: CreatePickupAuthorization) =>
      api.post<PickupAuthorization>("/pickup/authorizations", body),
    revokeAuthorization: (id: string) =>
      api.patch<PickupAuthorization>(`/pickup/authorizations/${id}/revoke`),
    logs: (studentId?: string) => api.get<PickupLog[]>("/pickup/logs", { query: { studentId } }),
    createLog: (body: CreatePickupLog) => api.post<PickupLog>("/pickup/logs", body),
  },
};

// ──────────────────────────────────────────────────────────────────────────
// Sức khỏe: thuốc · sự cố · hồ sơ đo lường · dị ứng.
// ──────────────────────────────────────────────────────────────────────────

export type MedicineStatus = "PENDING" | "APPROVED" | "REJECTED" | "ADMINISTERED";
export type MedicineHistory = { status: MedicineStatus; note?: string | null; actorId?: string | null; createdAt: string };
export type MedicineRequest = {
  id: string;
  studentId: string;
  medicineName: string;
  dosage: string;
  schedule: string;
  startDate: string;
  endDate: string;
  reason?: string | null;
  status: MedicineStatus;
  createdAt: string;
  student: { id: string; fullName: string };
  history?: MedicineHistory[];
};

export type IncidentSeverity = "LOW" | "MEDIUM" | "HIGH";
export type Incident = {
  id: string;
  studentId: string;
  date: string;
  type: string;
  severity: IncidentSeverity;
  description: string;
  actionTaken?: string | null;
  createdAt: string;
  student: { id: string; fullName: string };
};
export type CreateIncident = {
  studentId: string;
  date: string;
  type: string;
  severity?: IncidentSeverity;
  description: string;
  actionTaken?: string;
};

export type HealthRecord = {
  id: string;
  studentId: string;
  date: string;
  heightCm?: number | null;
  weightKg?: number | null;
  temperatureC?: number | null;
  note?: string | null;
  createdAt: string;
};
export type CreateHealthRecord = {
  studentId: string;
  date: string;
  heightCm?: number;
  weightKg?: number;
  temperatureC?: number;
  note?: string;
};

export type Allergy = {
  id: string;
  studentId: string;
  allergen: string;
  note?: string | null;
  createdAt: string;
};

// ──────────────────────────────────────────────────────────────────────────
// CRM feature ideas: phân công · nghỉ phép · thực đơn · giáo án · album · notifications.
// ──────────────────────────────────────────────────────────────────────────

export type Assignment = {
  id: string;
  schoolId: string;
  staffId: string;
  classroomId?: string | null;
  weekday: number;
  shift: Shift;
  duty: string;
  note?: string | null;
  createdAt: string;
  staff?: { id: string; fullName: string };
  classroom?: { id: string; name: string } | null;
};
export type CreateAssignment = {
  staffId: string;
  classroomId?: string;
  schoolId?: string;
  weekday: number;
  shift: Shift;
  duty: string;
  note?: string;
};

export type LeaveStatus = "PENDING" | "APPROVED" | "REJECTED";
export type LeaveType = "SICK" | "FAMILY" | "OTHER";
export type LeaveRequest = {
  id: string;
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string | null;
  attachmentUrl?: string | null;
  status: LeaveStatus;
  decisionNote?: string | null;
  handledAt?: string | null;
  createdAt: string;
  student?: { id: string; fullName: string };
};
export type CreateLeaveRequest = {
  studentId: string;
  leaveType: LeaveType;
  startDate: string;
  endDate: string;
  reason?: string;
  attachmentUrl?: string;
};

export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";
export type MenuMeal = {
  id: string;
  weekday: number;
  mealType: MealType;
  name: string;
  ingredients?: string | null;
};
export type WeeklyMenu = {
  id: string;
  schoolId: string;
  classroomId?: string | null;
  weekStart: string;
  note?: string | null;
  createdAt: string;
  classroom?: { id: string; name: string } | null;
  meals?: MenuMeal[];
};
export type CreateWeeklyMenu = {
  weekStart: string;
  schoolId?: string;
  classroomId?: string;
  note?: string;
  meals: { weekday: number; mealType: MealType; name: string; ingredients?: string }[];
};
export type MenuAllergyWarnings = {
  menuId: string;
  studentId: string;
  warnings: { mealId: string; weekday: number; mealType: MealType; name: string; matched: string[] }[];
};

export type LessonActivity = {
  id: string;
  dayOfWeek: number;
  startTime?: string | null;
  title: string;
  materials?: string | null;
};
export type LessonPlan = {
  id: string;
  classroomId: string;
  week: string;
  theme: string;
  note?: string | null;
  createdAt: string;
  classroom?: { id: string; name: string };
  activities?: LessonActivity[];
};
export type CreateLessonPlan = {
  classroomId: string;
  week: string;
  theme: string;
  note?: string;
  activities?: { dayOfWeek: number; startTime?: string; title: string; materials?: string }[];
};

export type MediaKind = "REPORT_PHOTO" | "ALBUM" | "AVATAR" | "DOCUMENT" | "OTHER";
export type UploadedMedia = {
  id: string;
  url: string;
  mimeType: string;
  sizeBytes: number;
  width?: number | null;
  height?: number | null;
};
export type AlbumPhoto = {
  id: string;
  mediaId: string;
  caption?: string | null;
  sortOrder: number;
  media: { id: string; path?: string | null; mimeType: string; width?: number | null; height?: number | null };
};
export type Album = {
  id: string;
  classroomId?: string | null;
  title: string;
  description?: string | null;
  createdAt: string;
  classroom?: { id: string; name: string } | null;
  photos?: AlbumPhoto[];
  _count?: { photos: number };
};
export type CreateAlbum = {
  title: string;
  description?: string;
  classroomId?: string;
  schoolId?: string;
};

export type NotificationType =
  | "ATTENDANCE"
  | "DAILY_REPORT"
  | "ANNOUNCEMENT"
  | "INVOICE"
  | "MEDICINE"
  | "LEAVE"
  | "INCIDENT";
export type NotificationItem = {
  id: string;
  type: NotificationType;
  title: string;
  body?: string | null;
  linkType?: string | null;
  linkId?: string | null;
  readAt?: string | null;
  createdAt: string;
};
export type NotificationPreference = { type: NotificationType; enabled: boolean };

export type PickupAuthorizationStatus = "ACTIVE" | "REVOKED";
export type PickupEventType = "CHECK_IN" | "CHECK_OUT";
export type PickupAuthorization = {
  id: string;
  studentId: string;
  parentUserId?: string | null;
  guardianName: string;
  guardianPhone: string;
  relationship?: string | null;
  note?: string | null;
  status: PickupAuthorizationStatus;
  createdAt: string;
  revokedAt?: string | null;
  student?: { id: string; fullName: string; classroom?: { id: string; name: string } | null };
  parentUser?: { id: string; fullName: string; phone?: string | null } | null;
};
export type CreatePickupAuthorization = {
  studentId: string;
  parentUserId?: string;
  guardianName: string;
  guardianPhone: string;
  relationship?: string;
  note?: string;
};
export type PickupLog = {
  id: string;
  studentId: string;
  authorizationId?: string | null;
  eventType: PickupEventType;
  guardianName: string;
  guardianPhone?: string | null;
  note?: string | null;
  occurredAt: string;
  createdAt: string;
  student?: { id: string; fullName: string; classroom?: { id: string; name: string } | null };
  authorization?: { id: string; guardianName: string; guardianPhone: string; relationship?: string | null } | null;
};
export type CreatePickupLog = {
  studentId?: string;
  authorizationId?: string;
  eventType: PickupEventType;
  guardianName?: string;
  guardianPhone?: string;
  note?: string;
  occurredAt?: string;
};

// ──────────────────────────────────────────────────────────────────────────
// Settings · Attendance · Daily reports · Tuition · Announcements · Audit.
// ──────────────────────────────────────────────────────────────────────────

export type TenantSettings = {
  displayName: string;
  logoUrl?: string | null;
  faviconUrl?: string | null;
  primaryColor?: string | null;
  secondaryColor?: string | null;
  emailFromName?: string | null;
  supportEmail?: string | null;
  locale: string;
  timezone: string;
  taxCode?: string | null;
  invoiceAddress?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
};
export type UpdateSettings = Partial<Omit<TenantSettings, never>>;

export type AttendanceStatus = "PRESENT" | "LATE" | "ABSENT" | "EXCUSED";
export type AttendanceRow = {
  id: string;
  studentId: string;
  classroomId: string;
  date: string;
  status: AttendanceStatus;
  checkInAt?: string | null;
  note?: string | null;
  student: { id: string; fullName: string };
};
export type MarkAttendance = {
  classroomId: string;
  date: string;
  entries: { studentId: string; status: AttendanceStatus; checkInAt?: string; note?: string }[];
};

export type Mood = "HAPPY" | "NEUTRAL" | "TIRED" | "FUSSY";
export type DailyReport = {
  id: string;
  studentId: string;
  classroomId?: string | null;
  date: string;
  mood?: Mood | null;
  meals?: string | null;
  nap?: string | null;
  activities?: string | null;
  note?: string | null;
  createdAt: string;
  student?: { id: string; fullName: string };
};
export type CreateReport = {
  studentId: string;
  date: string;
  mood?: Mood;
  meals?: string;
  nap?: string;
  activities?: string;
  note?: string;
};

export type TuitionInvoiceStatus = "UNPAID" | "PARTIAL" | "PAID" | "OVERDUE" | "CANCELED";
export type InvoiceItem = {
  id: string;
  label: string;
  quantity: number;
  unitPrice: number;
  amount: number;
};
export type Payment = {
  id: string;
  method: "CASH" | "BANK_TRANSFER" | "VNPAY";
  status: "PENDING" | "SUCCEEDED" | "FAILED" | "CANCELED";
  amount: number;
  reference?: string | null;
  paidAt?: string | null;
  createdAt: string;
};
export type Invoice = {
  id: string;
  studentId: string;
  invoiceNumber: string;
  period: string;
  issueDate: string;
  dueDate: string;
  subtotal: number;
  discount: number;
  total: number;
  amountPaid: number;
  status: TuitionInvoiceStatus;
  note?: string | null;
  createdAt: string;
  student: { id: string; fullName: string };
  items?: InvoiceItem[];
  payments?: Payment[];
};
export type CreateInvoice = {
  studentId: string;
  period: string;
  issueDate?: string;
  dueDate: string;
  discount?: number;
  note?: string;
  items: { label: string; quantity?: number; unitPrice: number }[];
};
export type ManualPayment = { method: "CASH" | "BANK_TRANSFER"; amount?: number; reference?: string };
export type VietQrData = {
  payload: string;
  bankBin: string;
  accountNumber: string;
  accountName?: string | null;
  amount: number;
  addInfo: string;
};

export type AnnouncementAudience = "ALL" | "PARENTS" | "TEACHERS" | "CLASS";
export type Announcement = {
  id: string;
  audience: AnnouncementAudience;
  classroomId?: string | null;
  title: string;
  body: string;
  publishedAt?: string | null;
  authorId?: string | null;
  createdAt: string;
  classroom?: { id: string; name: string } | null;
};
export type CreateAnnouncement = {
  audience: AnnouncementAudience;
  schoolId?: string;
  classroomId?: string;
  title: string;
  body: string;
  publish?: boolean;
};

export type AuditLog = {
  id: string;
  actorId?: string | null;
  actorType?: "PLATFORM" | "TENANT" | null;
  action: string;
  targetType?: string | null;
  targetId?: string | null;
  metadata?: Record<string, unknown> | null;
  createdAt: string;
};
