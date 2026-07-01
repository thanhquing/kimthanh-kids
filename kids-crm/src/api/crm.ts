import { api } from "./http";

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
    get: (id: string) => api.get<Classroom>(`/classrooms/${id}`),
    create: (body: CreateClassroom) => api.post<Classroom>("/classrooms", body),
    update: (id: string, body: UpdateClassroom) => api.patch<Classroom>(`/classrooms/${id}`, body),
    remove: (id: string) => api.delete<{ ok: true }>(`/classrooms/${id}`),
  },

  students: {
    list: (opts: { classroomId?: string; schoolId?: string } = {}) =>
      api.get<Student[]>("/students", { query: opts }),
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
    create: (body: CreateMember) => api.post<Member["user"]>("/tenant/members", body),
    setStatus: (userId: string, isActive: boolean) =>
      api.patch<{ id: string; isActive: boolean }>(`/tenant/members/${userId}/status`, { isActive }),
  },

  settings: {
    get: () => api.get<TenantSettings | null>("/tenant/settings"),
    update: (body: UpdateSettings) => api.patch<TenantSettings>("/tenant/settings", body),
  },

  attendance: {
    list: (classroomId: string, date: string) =>
      api.get<AttendanceRow[]>("/attendance", { query: { classroomId, date } }),
    mark: (body: MarkAttendance) => api.post<{ marked: number; skipped: number }>("/attendance/mark", body),
  },

  reports: {
    list: (classroomId: string, date: string) =>
      api.get<DailyReport[]>("/daily-reports", { query: { classroomId, date } }),
    byStudent: (studentId: string) => api.get<DailyReport[]>(`/daily-reports/student/${studentId}`),
    create: (body: CreateReport) => api.post<DailyReport>("/daily-reports", body),
  },

  tuition: {
    list: (opts: { status?: TuitionInvoiceStatus; studentId?: string } = {}) =>
      api.get<Invoice[]>("/tuition/invoices", { query: opts }),
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
    get: (id: string) => api.get<Announcement>(`/announcements/${id}`),
    create: (body: CreateAnnouncement) => api.post<Announcement>("/announcements", body),
    publish: (id: string) => api.post<Announcement>(`/announcements/${id}/publish`),
    remove: (id: string) => api.delete<{ ok: true }>(`/announcements/${id}`),
  },

  audit: {
    list: (opts: { action?: string; limit?: number } = {}) =>
      api.get<AuditLog[]>("/audit-logs", { query: opts }),
  },

  medicine: {
    list: (status?: MedicineStatus) => api.get<MedicineRequest[]>("/medicine", { query: { status } }),
    handle: (id: string, body: { status: MedicineStatus; note?: string }) =>
      api.post<MedicineRequest>(`/medicine/${id}/handle`, body),
  },

  incidents: {
    list: (studentId?: string) => api.get<Incident[]>("/incidents", { query: { studentId } }),
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

