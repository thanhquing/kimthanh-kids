import type {
  AnnouncementDTO,
  AttendanceDTO,
  CreateAnnouncementRequest,
  CreateDailyReportRequest,
  CreateMedicineRequestPayload,
  DailyReportDTO,
  LoginRequest,
  LoginResponse,
  MarkAttendanceRequest,
  MedicineRequestDTO,
  Paginated,
  PaginationQuery,
  RegisterRequest,
  StudentDTO,
  TuitionInvoiceDTO,
  UpdateUserRequest,
  UserDTO,
} from '@kimthanh/shared-types';

import { type ApiClient } from './client';

/**
 * Endpoint groups — each is a thin typed wrapper around ApiClient.
 * Add new resource groups here so apps consume them via `api.<group>.<method>`.
 */
export const createAuthEndpoints = (api: ApiClient) => ({
  login: (body: LoginRequest) => api.post<LoginResponse>('/auth/login', body),
  register: (body: RegisterRequest) => api.post<LoginResponse>('/auth/register', body),
  logout: () => api.post<void>('/auth/logout'),
  me: () => api.get<UserDTO>('/auth/me'),
});

export const createUserEndpoints = (api: ApiClient) => ({
  updateMe: (body: UpdateUserRequest) => api.patch<UserDTO>('/users/me', body),
  list: (query?: PaginationQuery) =>
    api.get<Paginated<UserDTO>>('/users', { params: query }),
});

export const createStudentEndpoints = (api: ApiClient) => ({
  list: (query?: PaginationQuery & { classroomId?: string }) =>
    api.get<Paginated<StudentDTO>>('/students', { params: query }),
  getById: (id: string) => api.get<StudentDTO>(`/students/${id}`),
});

export const createAttendanceEndpoints = (api: ApiClient) => ({
  list: (query: { classroomId: string; date: string }) =>
    api.get<AttendanceDTO[]>('/attendance', { params: query }),
  mark: (body: MarkAttendanceRequest) => api.post<AttendanceDTO>('/attendance', body),
});

export const createReportEndpoints = (api: ApiClient) => ({
  listForStudent: (studentId: string, query?: PaginationQuery) =>
    api.get<Paginated<DailyReportDTO>>(`/students/${studentId}/reports`, { params: query }),
  create: (body: CreateDailyReportRequest) => api.post<DailyReportDTO>('/reports', body),
});

export const createHealthEndpoints = (api: ApiClient) => ({
  listMedicineRequests: (query?: PaginationQuery & { studentId?: string; status?: string }) =>
    api.get<Paginated<MedicineRequestDTO>>('/health/medicine-requests', { params: query }),
  createMedicineRequest: (body: CreateMedicineRequestPayload) =>
    api.post<MedicineRequestDTO>('/health/medicine-requests', body),
});

export const createFinanceEndpoints = (api: ApiClient) => ({
  listInvoices: (query?: PaginationQuery & { studentId?: string; status?: string }) =>
    api.get<Paginated<TuitionInvoiceDTO>>('/finance/invoices', { params: query }),
});

export const createAnnouncementEndpoints = (api: ApiClient) => ({
  list: (query?: PaginationQuery) =>
    api.get<Paginated<AnnouncementDTO>>('/announcements', { params: query }),
  create: (body: CreateAnnouncementRequest) =>
    api.post<AnnouncementDTO>('/announcements', body),
});

export const createApiSdk = (api: ApiClient) => ({
  auth: createAuthEndpoints(api),
  users: createUserEndpoints(api),
  students: createStudentEndpoints(api),
  attendance: createAttendanceEndpoints(api),
  reports: createReportEndpoints(api),
  health: createHealthEndpoints(api),
  finance: createFinanceEndpoints(api),
  announcements: createAnnouncementEndpoints(api),
});

export type ApiSdk = ReturnType<typeof createApiSdk>;
