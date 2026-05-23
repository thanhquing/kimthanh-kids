# KimThanh Kindergarten — UI/UX Requirements for Lovable

> **You are Lovable.** Build two complete, production-quality frontends for the KimThanh Kindergarten platform:
>
> 1. **Mobile app** (Expo/React Native style — mobile-first, touch-optimized) for **Parents** and **Teachers**.
> 2. **Web dashboard** (Next.js / desktop-first, data-dense) for **Super Admin / Admin / Finance / Nurse / Teacher**.
>
> Both clients must consume the **same REST API** described below via a single typed SDK. Default user language is **Vietnamese** (`vi`); English (`en`) must be available as a switchable locale. All visible strings go through `t('namespace.key')` — **never hardcode UI text**. Use **Tailwind CSS + shadcn/ui** on web and **NativeWind** on mobile. Design system: warm, friendly, kindergarten-appropriate (soft rounded corners, generous whitespace, pastel accents on a clean white/neutral base, large readable typography). Fully responsive, accessible (WCAG AA), and modern.

---

## 1. Project Overview

KimThanh Kindergarten is a **multi-tenant kindergarten management ecosystem** scoped by `schoolId`. A single NestJS API (PostgreSQL + Prisma) is the system of record. Authentication uses **JWT access + refresh tokens**; authorization is **role-based** with a permission catalog.

- **API base URL**: `http://localhost:4000/api` (configurable via `NEXT_PUBLIC_API_URL` / `EXPO_PUBLIC_API_URL`)
- **All responses use this envelope**:
  ```ts
  // success
  { success: true, data: T, message?: string, meta?: { page, pageSize, total, totalPages } }
  // error
  { success: false, error: { code, message, messageKey?, details? } }
  ```
- **Auth header**: `Authorization: Bearer <accessToken>` on every protected request.
- **Token rotation**: On `401`, call `POST /auth/refresh` with the stored refresh token; replace both tokens; retry the original request once.
- **Token storage**: Web → `localStorage`. Mobile → `expo-secure-store`.
- **i18n default**: `vi`. Locale files live in `apps/<app>/locales/{vi,en}/common.json`.
- **Currency**: VND. Format with thousand separators (e.g. `1.500.000 ₫`).
- **Dates**: API uses `YYYY-MM-DD` for date-only fields and ISO 8601 for datetimes. UI displays dates as `DD/MM/YYYY` in Vietnamese.

### 1.1 User Roles

| Role | Primary UI | Capabilities |
|---|---|---|
| `SUPER_ADMIN` | Web dashboard | Full system access across all schools |
| `ADMIN` | Web dashboard | Manage one school: users, students, classrooms, finance, announcements |
| `FINANCE` | Web dashboard | View/manage invoices, record payments |
| `NURSE` | Web dashboard | Manage medicine requests, health records, incidents |
| `TEACHER` | Mobile (primary) + Web | Daily reports, attendance, classroom announcements |
| `PARENT` | Mobile (primary) | View child's reports/attendance/invoices, request medicine, receive announcements |

### 1.2 Core Data Entities

```
School           - tenant root: id, name, code, address, phone, email, logoUrl
User             - id, email, fullName, phone, avatarUrl, role, status, schoolId, locale
Classroom        - id, schoolId, name, ageGroup, capacity, homeroomTeacherId
Student          - id, schoolId, classroomId, fullName, nickname, dateOfBirth, gender, avatarUrl, parentIds[]
StudentParent    - studentId, parentId, relationship, isPrimary
Attendance       - id, studentId, classroomId, date, status, checkInAt, checkOutAt, note, recordedById
DailyReport      - id, studentId, classroomId, date, mood, meals, nap, activities, note, mediaIds[], authorId
MedicineRequest  - id, studentId, requestedById, medicineName, dosage, schedule, startDate, endDate, reason, status, handledById, handledAt, note
HealthRecord     - id, studentId, date, heightCm, weightKg, temperatureC, notes, recordedById
Incident         - id, studentId, date, description, severity, actionTaken, reportedById
TuitionInvoice   - id, schoolId, studentId, period, amount, currency, dueDate, status, paidAt, paymentMethod, note
Payment          - id, invoiceId, amount, currency, method, reference, paidAt, recordedById
Announcement    - id, schoolId, title, body, audience, classroomId, publishedAt, authorId
Media            - id, type (IMAGE|VIDEO|DOCUMENT), url, thumbnailUrl, mimeType, sizeBytes, uploadedById, studentIds[], classroomId
```

### 1.3 Enums (use in dropdowns / badges)

- `UserRole`: SUPER_ADMIN · ADMIN · FINANCE · NURSE · TEACHER · PARENT
- `UserStatus`: ACTIVE · INACTIVE · SUSPENDED · PENDING
- `Gender`: MALE · FEMALE · OTHER
- `AttendanceStatus`: PRESENT · ABSENT · LATE · EXCUSED
- `MedicineRequestStatus`: PENDING · APPROVED · REJECTED · ADMINISTERED · CANCELLED
- `PaymentStatus`: PENDING · PAID · OVERDUE · REFUNDED · CANCELLED
- `AnnouncementAudience`: ALL · PARENTS · TEACHERS · STAFF · CLASS
- `IncidentSeverity`: LOW · MEDIUM · HIGH
- `MediaType`: IMAGE · VIDEO · DOCUMENT

### 1.4 Complete API Endpoint Reference

All paths are prefixed with `/api`. `🔓` = public, `🔒` = JWT required.

#### Auth
| Method | Path | Auth | Body | Returns |
|---|---|---|---|---|
| POST | `/auth/register` | 🔓 | `{ email, password (≥8, upper+lower+digit), fullName, phone?, role? }` | `{ user: UserDTO, tokens: { accessToken, refreshToken, expiresIn } }` |
| POST | `/auth/login` | 🔓 | `{ email, password }` | `{ user, tokens }` |
| POST | `/auth/refresh` | 🔓 | `{ refreshToken }` | `{ accessToken, refreshToken, expiresIn }` |
| POST | `/auth/logout` | 🔒 | — | `204` |
| GET | `/auth/me` | 🔒 | — | `UserDTO` |

#### Users
| Method | Path | Roles | Query/Body | Returns |
|---|---|---|---|---|
| PATCH | `/users/me` | any | `{ fullName?, phone?, avatarUrl?, locale? }` | `UserDTO` |
| GET | `/users` | ADMIN, SUPER_ADMIN | `?page=&pageSize=` | `Paginated<UserDTO>` |

#### Students
| Method | Path | Roles | Query/Path | Returns |
|---|---|---|---|---|
| GET | `/students` | any (scoped per role) | `?page=&pageSize=&classroomId=` | `Paginated<StudentDTO>` |
| GET | `/students/:id` | any (scoped) | — | `StudentDTO` |
| GET | `/students/:studentId/reports` | any (scoped) | `?page=&pageSize=` | `Paginated<DailyReportDTO>` |

#### Classrooms
| Method | Path | Roles | Returns |
|---|---|---|---|
| GET | `/classrooms` | any (scoped) | `Paginated<ClassroomDTO>` |

#### Attendance
| Method | Path | Roles | Body/Query | Returns |
|---|---|---|---|---|
| GET | `/attendance` | any | `?classroomId=&date=YYYY-MM-DD` (both required) | `AttendanceDTO[]` |
| POST | `/attendance` | TEACHER, ADMIN, SUPER_ADMIN | `{ studentId, classroomId, date, status, checkInAt?, checkOutAt?, note? }` | `AttendanceDTO` |

#### Reports
| Method | Path | Roles | Body | Returns |
|---|---|---|---|---|
| POST | `/reports` | TEACHER, ADMIN, SUPER_ADMIN | `{ studentId, classroomId, date, mood?, meals?, nap?, activities?, note?, mediaIds?[] }` | `DailyReportDTO` |

#### Health (Medicine)
| Method | Path | Roles | Body/Query | Returns |
|---|---|---|---|---|
| GET | `/health/medicine-requests` | any (scoped) | `?page=&pageSize=&studentId=&status=` | `Paginated<MedicineRequestDTO>` |
| POST | `/health/medicine-requests` | PARENT, ADMIN, SUPER_ADMIN | `{ studentId, medicineName, dosage, schedule, startDate, endDate, reason? }` | `MedicineRequestDTO` |

#### Finance
| Method | Path | Roles | Query | Returns |
|---|---|---|---|---|
| GET | `/finance/invoices` | any (scoped) | `?page=&pageSize=&studentId=&status=` | `Paginated<TuitionInvoiceDTO>` |

#### Announcements
| Method | Path | Roles | Body/Query | Returns |
|---|---|---|---|---|
| GET | `/announcements` | any (scoped) | `?page=&pageSize=` | `Paginated<AnnouncementDTO>` |
| POST | `/announcements` | ADMIN, SUPER_ADMIN, TEACHER | `{ title, body, audience, classroomId?, publishedAt? }` | `AnnouncementDTO` |

#### Media
| Method | Path | Returns |
|---|---|---|
| GET | `/media/health` | `{ ok: true }` (placeholder only — upload endpoint not yet implemented; show stub UI but flag uploads as "coming soon") |

---

## 2. Shared Foundations (build these once, use everywhere)

1. **`ApiClient`** — single class wrapping `fetch`/`axios`, attaches `Authorization`, unwraps the `ApiResponse<T>` envelope, throws typed `ApiError` on `success: false`, and handles 401 → refresh → retry once.
2. **`AuthStore`** (Zustand) — `user`, `accessToken`, `refreshToken`, `login()`, `logout()`, `refresh()`, `hydrateFromStorage()`. Restore on app start.
3. **`I18nProvider`** — wires `next-intl` (web) / `i18next` (mobile). Provides `t()`. Ships `vi` and `en` namespaces: `common`, `auth`, `students`, `attendance`, `reports`, `health`, `finance`, `announcements`, `errors`, `roles`, `enums`.
4. **`PermissionGate`** component — `<Can permission="finance:invoice:write">…</Can>`. Reads from the RBAC catalog.
5. **Shared UI primitives** — `Button`, `Card`, `Input`, `Select`, `Modal`/`Sheet`, `Badge` (status pills), `Avatar`, `EmptyState`, `Skeleton`, `Toast`, `DataTable` (web), `ListItem` (mobile), `DatePicker`, `Pagination`, `SearchBar`, `Tabs`, `FormField` (label + control + error).
6. **Status badge color map** (consistent everywhere):
   - PRESENT/PAID/APPROVED/ACTIVE → green
   - LATE/PENDING → amber
   - ABSENT/OVERDUE/REJECTED/SUSPENDED → red
   - EXCUSED/REFUNDED/INACTIVE → slate
   - ADMINISTERED → blue
7. **Loading / error / empty states** for every list and form.
8. **Optimistic updates** where safe (mark attendance, mark message read).

---

## 3. MOBILE APP — Screen-by-Screen Specification

> **Target users**: Parents (primary) + Teachers (secondary). Mobile-first, one-hand reachable, bottom tab navigation, generous tap targets (≥44px), pull-to-refresh on every list. Use bottom sheets for forms, not modal stacks.

### M0. Splash / Bootstrap
- **Purpose**: Hydrate auth from secure storage, call `GET /auth/me` to validate, then route to Login or Home.
- **API**: `GET /api/auth/me`
- **UI**: KimThanh logo centered, soft loading indicator. Auto-redirect on success/failure.

### M1. Login
- **Purpose**: Email + password authentication.
- **API**: `POST /api/auth/login` → store tokens, fetch `GET /auth/me`, route by role.
- **Fields**: `email` (validated), `password` (min 1, visibility toggle).
- **UI**: Hero illustration, "KimThanh" wordmark, two inputs, primary "Đăng nhập" button, "Đăng ký" link, "Quên mật khẩu?" link (placeholder).
- **Errors**: Map `error.messageKey` → translated toast (e.g. `errors.auth.invalidCredentials` → "Email hoặc mật khẩu không đúng").

### M2. Register (Parent self-signup)
- **Purpose**: Create a `PARENT` account (default role).
- **API**: `POST /api/auth/register` with `role: "PARENT"`.
- **Fields**: `fullName` (≥2), `email`, `phone` (optional), `password` (≥8, must contain upper + lower + digit — live strength meter), confirm password.
- **UI**: Stepper feel (single scrollable form). Inline validation hints.

### M3. Home / Dashboard (role-aware)
- **Purpose**: Entry point after login.
- **APIs**: `GET /students` (filtered by parent linkage server-side), `GET /announcements?pageSize=3`, plus role-specific summary fetches.
- **Parent view**:
  - Greeting card: "Xin chào, {fullName}".
  - Child carousel — one card per linked student (avatar, name, classroom name). Tap → Student Detail.
  - "Hôm nay" section: today's attendance status per child (badge), today's daily report preview if available.
  - Recent announcements (3 latest, title + relative time).
  - Outstanding invoices count chip.
- **Teacher view**:
  - Greeting + "Lớp của tôi" card (homeroom classroom name + student count).
  - Quick actions row: "Điểm danh hôm nay", "Báo cáo hằng ngày", "Đăng thông báo".
  - Pending: students without today's attendance, students without today's report.
- **Interactions**: Pull to refresh, tap action → corresponding screen.

### M4. Children List (Parent) / Classroom Roster (Teacher)
- **Purpose**: Pick a student.
- **API**: `GET /api/students?classroomId=…` (teacher) or implicit-parent-scope (parent).
- **UI**: List of cards (avatar, fullName, nickname, age computed from `dateOfBirth`, classroom). Search bar (client-side filter). Pull-to-refresh, infinite scroll using `page`/`pageSize`.

### M5. Student Detail
- **Purpose**: Single student hub.
- **API**: `GET /api/students/:id` (+ aggregates per tab).
- **UI**: Hero header (avatar, fullName, nickname, gender, DOB, classroom). Tabs: **Tổng quan** · **Điểm danh** · **Báo cáo hằng ngày** · **Sức khỏe** · **Học phí** · **Hình ảnh**.
- **Mapping**: `fullName` → title, `dateOfBirth` → "Sinh ngày {DD/MM/YYYY} · {age} tuổi", `gender` → translated badge.

### M6. Attendance — Day View (Teacher)
- **Purpose**: Mark attendance for a classroom on a given date.
- **APIs**:
  - `GET /api/attendance?classroomId={cls}&date={YYYY-MM-DD}` → existing records.
  - `POST /api/attendance` → create/update one record (per student, idempotent via unique `[studentId, date]`).
- **UI**: Date picker at top (default today). Below: scrollable list of students. Each row = avatar, name, segmented control (PRESENT / LATE / ABSENT / EXCUSED), optional note button → bottom sheet for `checkInAt` / `checkOutAt` / `note`. "Lưu" button posts all rows that changed (sequentially or in parallel). Optimistic UI with rollback on error.

### M7. Attendance History (Parent + Teacher)
- **Purpose**: View a student's attendance over time.
- **API**: Repeated `GET /api/attendance?classroomId=&date=` per day in window, OR (best for parent) fetch a month and group client-side. (If a single endpoint per-student is needed later, document as "TODO: backend".)
- **UI**: Calendar heatmap (green/amber/red dots per day) + scroll list of last 30 days with status badge.

### M8. Daily Report — Compose (Teacher)
- **Purpose**: Submit a daily report for one student (or batch flow: pick a student, fill, save, next).
- **API**: `POST /api/reports`.
- **Fields**: `studentId` (preselected), `classroomId` (auto), `date` (default today), `mood` (chip group: Vui · Bình thường · Mệt · Quấy), `meals` (textarea ≤500), `nap` (chip group: Ngủ ngon · Khó ngủ · Không ngủ), `activities` (textarea ≤1000), `note` (textarea ≤1000), `mediaIds[]` (placeholder uploader — show "Upload sắp ra mắt").
- **UI**: Step-form on mobile. Save button → toast → return to list.

### M9. Daily Report — Feed (Parent)
- **Purpose**: Read child's reports.
- **API**: `GET /api/students/:studentId/reports?page=&pageSize=20`.
- **UI**: Reverse-chronological feed of cards: date header, author name (resolve via `/users` cache), mood emoji, sections (Bữa ăn, Ngủ trưa, Hoạt động, Ghi chú), media thumbnails. Infinite scroll. Tap card → full-screen detail.

### M10. Medicine Request — List
- **Purpose**: Parent sees their requests; Nurse handles them.
- **API**: `GET /api/health/medicine-requests?studentId=&status=&page=&pageSize=`.
- **UI**: Filter chips for status. List rows: child name, medicineName, dosage, date range, status badge. Pull to refresh.

### M11. Medicine Request — Create (Parent)
- **Purpose**: Ask the nurse to administer medicine.
- **API**: `POST /api/health/medicine-requests`.
- **Fields**: `studentId` (picker if multiple children), `medicineName` (≤120), `dosage` (≤120), `schedule` (≤200, e.g. "8h sáng và 14h chiều"), `startDate`, `endDate` (must be ≥ startDate — client-side check), `reason` (textarea ≤500).
- **UI**: Bottom-sheet form. Submit → toast + back to list.

### M12. Medicine Request — Detail
- **Purpose**: View full request, see nurse's note + status timeline.
- **UI**: Read-only card. Status timeline: PENDING → APPROVED/REJECTED → ADMINISTERED/CANCELLED. Show `handledBy` fullName + `handledAt`.

### M13. Invoices (Parent)
- **Purpose**: See tuition bills for their children.
- **API**: `GET /api/finance/invoices?studentId=&status=&page=&pageSize=`.
- **UI**: Tabs: "Chưa thanh toán" (status=PENDING/OVERDUE) · "Đã thanh toán" (status=PAID) · "Tất cả". Card per invoice: period, amount (VND formatted), due date, status badge. Tap → detail with payment method, paidAt, note. (Online payment is out-of-scope — show "Liên hệ trường để thanh toán".)

### M14. Announcements — Feed
- **Purpose**: Read school/classroom announcements.
- **API**: `GET /api/announcements?page=&pageSize=20`.
- **UI**: Reverse-chronological feed. Card per announcement: audience badge (icon), classroom name if `audience=CLASS`, title, body excerpt, `publishedAt` relative ("2 giờ trước"). Tap → full-screen detail.

### M15. Announcement — Compose (Teacher)
- **Purpose**: Post a class announcement.
- **API**: `POST /api/announcements`.
- **Fields**: `title` (2-200), `body` (rich-ish textarea 2-5000), `audience` (default CLASS for teacher), `classroomId` (auto from teacher's homeroom; required if `audience=CLASS`), `publishedAt` (datetime picker; default now).
- **UI**: Full-screen composer. Preview pane. Submit → toast.

### M16. Profile (Me)
- **Purpose**: View/edit own profile + language + logout.
- **APIs**: `GET /api/auth/me` (already cached), `PATCH /api/users/me`, `POST /api/auth/logout`.
- **Fields editable**: `fullName`, `phone`, `avatarUrl` (placeholder picker), `locale` (vi/en toggle — switches `t()` immediately).
- **UI**: Sectioned settings list. Logout button at bottom (confirm sheet).

### M17. Notifications (placeholder)
- **Purpose**: Future push notifications. For now, show a feed mirroring announcements with read/unread state stored locally.

### M18. Error / Offline / Empty States
- **Offline banner** when fetch fails with network error.
- **Empty states** with friendly illustration + CTA on every list.
- **Toast system** for success/error messages (translate `messageKey` when present, fall back to `error.message`).

### Mobile Navigation Structure
- **Bottom tabs (Parent)**: Trang chủ · Con tôi · Thông báo · Hồ sơ.
- **Bottom tabs (Teacher)**: Trang chủ · Lớp · Báo cáo · Thông báo · Hồ sơ.
- **Stack inside each tab**: list → detail → compose.

---

## 4. WEB DASHBOARD — Screen-by-Screen Specification

> **Target users**: SUPER_ADMIN / ADMIN / FINANCE / NURSE / TEACHER. Desktop-first, data-dense, sidebar navigation, multi-column layouts, full DataTable with sorting/filtering/pagination/CSV export. Must still be responsive down to tablet (768px) — sidebar collapses to drawer.

### Layout shell
- **Top bar**: KimThanh logo, school selector (SUPER_ADMIN only), global search (placeholder), language toggle (vi/en), notifications bell, user menu (avatar dropdown → Hồ sơ, Đăng xuất).
- **Left sidebar** (collapsible): role-gated nav items. Active route highlighted. Section grouping with subtle headings.
- **Main content area**: Page header (title + breadcrumb + primary action button on the right) → filter bar → content (table/grid/cards) → pagination footer.

### W0. Public Marketing Landing (`/`)
- **Purpose**: Existing Next.js marketing site already lives in `apps/web`. Keep / restyle the landing page introducing KimThanh Kindergarten with a hero (school name + tagline), feature highlights (Quản lý lớp, Báo cáo hằng ngày, Theo dõi sức khỏe, Học phí minh bạch), gallery placeholder, contact section, and CTAs: "Đăng nhập" / "Đăng ký phụ huynh". No API calls.

### W1. Login (`/login`)
- **API**: `POST /api/auth/login`. Same fields as M1, but desktop-styled centered card on a soft gradient background.

### W2. Forgot Password (placeholder)
- Static page explaining the user should contact the school admin (backend not yet implemented).

### W3. Dashboard Home (`/dashboard`)
- **Purpose**: Role-aware KPI overview.
- **APIs**:
  - `GET /api/students?pageSize=1` → use `meta.total` as student count.
  - `GET /api/users?pageSize=1` → user count.
  - `GET /api/classrooms?pageSize=1` → classroom count.
  - `GET /api/finance/invoices?status=PENDING&pageSize=1` → outstanding count.
  - `GET /api/finance/invoices?status=OVERDUE&pageSize=1` → overdue count.
  - `GET /api/health/medicine-requests?status=PENDING&pageSize=1` → pending requests count.
  - `GET /api/announcements?pageSize=5` → recent feed.
- **UI**: 4-6 KPI cards (icon + label + big number + tiny delta if available). Below: two columns — "Thông báo gần đây" (announcement list) and "Cần xử lý" (action queue: pending medicine requests, overdue invoices). Right rail: quick links by role.
- **Charts**: Use **Recharts** for:
  - Attendance trend (line chart, last 30 days) — derived from per-day `GET /api/attendance` calls or aggregated client-side.
  - Revenue by month (bar chart) — derived from invoices with `status=PAID` grouped by `period`.
  - Medicine requests by status (donut chart).

### W4. Users (`/dashboard/users`) — ADMIN / SUPER_ADMIN
- **API**: `GET /api/users?page=&pageSize=`. (Create/update beyond `/users/me` not yet implemented — show disabled "Mời người dùng" button with tooltip "Sắp ra mắt".)
- **UI**: DataTable columns: Avatar · Họ tên · Email · Vai trò · Trạng thái · Trường · Ngày tạo · Hành động (View). Filters: role (multi-select), status (multi-select), search by email/name (client-side). Sort by createdAt. Pagination (server-driven).
- **Detail drawer/page**: Full UserDTO read-only view; placeholder for "Đặt lại mật khẩu", "Tạm khóa".

### W5. Classrooms (`/dashboard/classrooms`)
- **API**: `GET /api/classrooms`.
- **UI**: Grid of classroom cards (name, ageGroup, capacity badge, homeroom teacher name resolved via users cache, current student count via `GET /students?classroomId=`). Action: "Xem chi tiết" → W5a.

### W5a. Classroom Detail (`/dashboard/classrooms/:id`)
- **API**: `GET /api/students?classroomId=:id`, `GET /api/attendance?classroomId=:id&date=:today`, `GET /api/announcements` (filter to classroomId client-side).
- **UI**: Header card (name, ageGroup, homeroom teacher, capacity vs current). Tabs: **Học sinh** (table) · **Điểm danh hôm nay** (status board) · **Báo cáo gần đây** (timeline) · **Thông báo lớp**.

### W6. Students (`/dashboard/students`)
- **API**: `GET /api/students?page=&pageSize=&classroomId=`.
- **UI**: DataTable: Avatar · Họ tên · Biệt danh · Ngày sinh (formatted DD/MM/YYYY) · Tuổi · Giới tính · Lớp · Phụ huynh (count + tooltip listing names) · Hành động. Filter bar: classroom select, gender, age range, search by name. Bulk actions placeholder.

### W6a. Student Profile (`/dashboard/students/:id`)
- **API**: `GET /api/students/:id`, `GET /api/students/:id/reports`, `GET /api/health/medicine-requests?studentId=`, `GET /api/finance/invoices?studentId=`, derived attendance from `/attendance`.
- **UI**: Two-column. Left: profile card (avatar, full demographics, parents list). Right: tabbed content (Tổng quan · Điểm danh · Báo cáo · Sức khỏe · Học phí · Hình ảnh) mirroring the mobile detail but with desktop-density tables instead of feed cards.

### W7. Attendance (`/dashboard/attendance`) — TEACHER / ADMIN
- **APIs**: `GET /api/classrooms` (for selector), `GET /api/attendance?classroomId=&date=`, `POST /api/attendance`.
- **UI**: Top filter: classroom select + date picker. Main: grid/table of all students in the classroom, each row inline-editable (segmented status control + check-in time + check-out time + note field). "Lưu thay đổi" floating action saves dirty rows in parallel. Show last-saved indicator per row. Below table: KPI strip (P/L/A/E counts + percentage).

### W8. Daily Reports (`/dashboard/reports`)
- **APIs**: `GET /api/students?classroomId=`, `GET /api/students/:id/reports`, `POST /api/reports`.
- **UI**: Two-pane. Left pane: classroom select + student list (clickable). Right pane: report timeline for the selected student + "Tạo báo cáo mới" button → side modal with the full form (same fields as M8). Each timeline entry is expandable.

### W9. Health — Medicine Requests (`/dashboard/health/medicine-requests`) — NURSE / ADMIN
- **API**: `GET /api/health/medicine-requests?page=&pageSize=&status=&studentId=`.
- **UI**: DataTable: Học sinh · Thuốc · Liều · Lịch · Từ ngày · Đến ngày · Trạng thái (badge) · Phụ huynh (requestedBy) · Hành động. Filters: status, date range, classroom (via students join), search. Row click → drawer with full detail. Action buttons in drawer: "Duyệt", "Từ chối", "Đã cho uống", "Hủy" — placeholder (backend update endpoint to be added). Show this clearly: button enabled but on click shows toast "Chức năng đang được hoàn thiện".

### W10. Health Records & Incidents (`/dashboard/health/records`, `/dashboard/health/incidents`)
- **Note**: Backend GET/POST not yet exposed — build the UI shell against the DTO shapes and stub data, with a "Beta" badge. List view + create modal. This signals the design to backend team.

### W11. Finance — Invoices (`/dashboard/finance/invoices`) — FINANCE / ADMIN
- **API**: `GET /api/finance/invoices?page=&pageSize=&status=&studentId=`.
- **UI**: DataTable: Mã (id short) · Học sinh · Kỳ (period) · Số tiền (VND formatted) · Hạn (dueDate, red if overdue) · Trạng thái · Thanh toán lúc · Phương thức · Hành động. Filters: status, period select (year/month), classroom, student search. Summary strip above table: Tổng phải thu · Đã thu · Còn lại · Quá hạn.
- **Row click** → invoice detail drawer with payments list + "Ghi nhận thanh toán" button (placeholder until POST endpoint).

### W12. Finance — Payments (`/dashboard/finance/payments`)
- **Note**: Backend listing not yet exposed — derive from invoices with `status=PAID`. UI: simple table.

### W13. Announcements (`/dashboard/announcements`)
- **APIs**: `GET /api/announcements?page=&pageSize=`, `POST /api/announcements`.
- **UI**: Split: left = list with audience filter and search; right = preview pane. Toolbar: "Tạo thông báo" → modal composer (title, body markdown-style textarea, audience select, classroom select if audience=CLASS, scheduled `publishedAt` toggle).

### W14. School Settings (`/dashboard/settings/school`) — ADMIN / SUPER_ADMIN
- **Note**: Backend not yet exposed — display read-only school info derived from the current user's `schoolId`. Show form fields disabled with "Sắp ra mắt" hint.

### W15. My Profile (`/dashboard/profile`)
- **APIs**: `GET /api/auth/me`, `PATCH /api/users/me`, `POST /api/auth/logout`.
- **UI**: Same as M16 but desktop-styled with avatar uploader placeholder, two columns (personal info + preferences).

### W16. 401/403/404 pages
- **401** → redirect to `/login` with toast.
- **403** "Bạn không có quyền truy cập" with link back to dashboard home.
- **404** friendly illustration + "Trang không tồn tại".

### Web Sidebar Navigation (role-gated)
- **Tổng quan** (all)
- **Lớp học** (all)
- **Học sinh** (all)
- **Điểm danh** (TEACHER, ADMIN, SUPER_ADMIN)
- **Báo cáo hằng ngày** (TEACHER, ADMIN, SUPER_ADMIN)
- **Sức khỏe** → Yêu cầu thuốc · Hồ sơ sức khỏe · Sự cố (NURSE, ADMIN, SUPER_ADMIN)
- **Tài chính** → Hóa đơn · Thanh toán (FINANCE, ADMIN, SUPER_ADMIN)
- **Thông báo** (all)
- **Người dùng** (ADMIN, SUPER_ADMIN)
- **Cài đặt** → Trường · Hồ sơ (ADMIN, SUPER_ADMIN)

---

## 5. Cross-Cutting UX Requirements

### Visual design
- **Brand palette**: soft sky blue (#7BB7E0) primary, warm peach (#FFB48A) accent, fresh mint (#A7E0B5) success, soft coral (#FF7A7A) danger, sand (#F8F4EE) background, slate (#1F2937) text.
- **Typography**: Inter or Be Vietnam Pro. H1 28-32px, H2 20-24px, body 14-16px. Mobile body 16px minimum.
- **Rounded** corners (`rounded-2xl` for cards, `rounded-xl` for buttons). Subtle shadows.
- **Illustrations**: friendly, age-appropriate icons (use lucide-react / phosphor for icons). Use Unsplash placeholders for hero / empty states.
- **Dark mode**: support via Tailwind `dark:` variants — default to system preference.

### Interaction
- Every list = pull-to-refresh (mobile) or refresh button (web), server-driven pagination, skeleton loaders, empty states.
- Every form = inline validation (Zod-style mirroring backend schemas — see §1.4), disable submit while pending, optimistic UI where safe.
- Filters and pagination state in URL query string (web) and screen state (mobile).
- Date pickers default to today, lock impossible ranges (endDate ≥ startDate).
- Use **react-query / TanStack Query** for caching, retries, and background revalidation. Query keys must include all filter params.

### Accessibility
- Color contrast ≥ 4.5:1 for body text.
- All interactive elements keyboard-reachable on web. Visible focus ring.
- Form labels associated with inputs. Errors announced via `aria-live`.
- Tap targets ≥ 44×44 on mobile.

### Performance
- Code-split per route (web). Lazy-load heavy charts.
- Image thumbnails before full-size on media tabs.
- Debounce search inputs (300ms).

### Error handling
- **401** → silent refresh; if refresh fails, force logout + redirect to login.
- **403** → toast "Bạn không có quyền cho hành động này".
- **422 / validation** → highlight offending fields using `error.details`.
- **5xx / network** → generic toast + retry button.
- Always prefer `error.messageKey` (translate) over `error.message` (raw).

---

## 6. Project Structure Lovable Must Follow

Mirror the existing monorepo conventions. Build the frontends as if they will drop into:

```
apps/
  web/                     Next.js 14 App Router
    src/
      app/[locale]/        ...localized routes (vi/en)
      components/          reusable shadcn-based components
      features/            domain features (students, attendance, finance...)
      lib/api.ts           thin re-export of @kimthanh/shared-api-client
      hooks/               useStudents, useAttendance, useInvoices...
      stores/              auth, ui
    locales/{vi,en}/common.json
  mobile/                  Expo + NativeWind
    src/
      navigation/          tab + stack navigators
      screens/             one folder per screen group
      components/          shared primitives
      features/            mirrors web/features
      hooks/
      stores/
    locales/{vi,en}/common.json
```

- **Reusable components** in `components/` — never duplicate a card/list-item/form-field.
- **Feature folders** group screens + hooks + types per domain (e.g. `features/attendance/`).
- **API calls** only via `@kimthanh/shared-api-client` (or, if Lovable cannot import it, a faithful re-implementation in `lib/api.ts` mirroring the same method signatures and base URL — never call `fetch` ad-hoc inside components).
- **Types** import from `@kimthanh/shared-types` (or mirror locally as `types/` until the package is wired up).

---

## 7. Acceptance Checklist (deliver all of this)

- [ ] Login + register + refresh flow works end-to-end against the documented API.
- [ ] Role-based routing: PARENT cannot reach `/dashboard/users`, etc.
- [ ] Every screen listed in §3 and §4 is implemented (placeholders allowed where the backend endpoint is documented as not-yet-exposed — clearly label them).
- [ ] Vietnamese is the default. English toggle works. No hardcoded strings in JSX.
- [ ] All forms validate against the schemas in §1.4 before submission.
- [ ] All lists paginate server-side and show skeleton/empty/error states.
- [ ] All status badges follow the color map in §2.
- [ ] Currency, date, and relative-time formatting follow §1 rules.
- [ ] Token refresh on 401 is automatic and silent.
- [ ] Mobile: bottom tabs + stack navigation; pull-to-refresh on every list; bottom-sheet forms.
- [ ] Web: sidebar shell with role-gated nav; DataTable with sort/filter/paginate; URL-synced filters; Recharts on dashboard home.
- [ ] Dark mode supported throughout.
- [ ] Reusable components extracted; no duplicate UI primitives.
- [ ] Code organized per §6.

> **Final note to Lovable**: This API is **real and live**. Wire the actual `fetch` / `axios` calls to the documented endpoints exactly as specified — do not stub data unless explicitly noted as "not-yet-exposed". Build both apps with a shared typed API client. Prioritize a polished, warm, kindergarten-friendly look that parents will trust and teachers will enjoy using daily.
