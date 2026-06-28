# kids-mobile-web — Kế hoạch integrate API (mobile ↔ kids-api)

> Mục tiêu: thay toàn bộ `src/mockData.ts` bằng API thật của **kids-api**, hoàn thiện trọn bộ app cho 2 role **Phụ huynh** & **Giáo viên**. **Không phụ thuộc kids-crm** — dùng `prisma:seed:demo` làm nguồn dữ liệu khi dev (crm là client ngang hàng, không chặn).

## Quy trình BẮT BUỘC cho mỗi task (theo thứ tự, làm xong mới chuyển task)

1. **Integrate API** — gắn endpoint kids-api vào màn (qua `src/api/<domain>.ts` + react-query hook), bỏ mock.
2. **Cải thiện mock UI** — chỉnh UI khớp dữ liệu thật (field thiếu/thừa, empty state, loading, lỗi).
3. **Cải thiện API nếu cần** — bổ sung param/payload/response ở kids-api cho khớp UI (kèm cập nhật doc kids-documentation theo quy ước CLAUDE.md).
4. **cURL verify** — login đúng host tenant → gọi endpoint → response khớp 100% UI. **Pass mới chuyển task.**
   - Trong cùng pass: **i18n hoá** chuỗi của màn (VI/EN, dict parity) + tick trạng thái ở file này.

Legend: `TODO` / `PROGRESS` / `DONE`. Mỗi task ghi: endpoint, role, ghi chú cURL.

## Nền tảng (convention — bám sát kids-platform)

- HTTP: `src/api/http.ts` (đã có — copy file mẫu platform; envelope `{success,data,error}`, refresh 401, `x-language`).
- Data fetching: **react-query** (`useQuery`/`useMutation`, `queryKey` theo domain) — giống platform.
- Mỗi domain 1 module `src/api/<domain>.ts` khai type tay (OpenAPI mỏng), list trả mảng (http bóc `data`).
- Tenant resolve theo **Host** (dev proxy gắn `demo.kimthanhkids.vn`).

## Tài khoản test (seed demo, host `demo.kimthanhkids.vn`, mật khẩu `Password123`)

- Phụ huynh: `0901000001` … `0901000012` (ph01..ph12)
- Giáo viên: `0909000010` (co.mai), `0909000011` (co.lan)

---

## ĐÃ XONG

| Status | Task | Endpoint | Ghi chú |
| --- | --- | --- | --- |
| DONE | Auth (login/logout) | `POST /auth/login` · `GET /auth/me` · `POST /auth/refresh` · `POST /auth/logout` | Login bằng SĐT → me → route theo `roles[]`. cURL pass (parent+teacher, lỗi INVALID_CREDENTIALS/TENANT_REQUIRED). |
| DONE | i18n hạ tầng | — | `lib/language` + `i18n` (useT, vi/en parity), `x-language` header, switcher login + profile. Đã migrate: Login, Reset, tab bar, Profile. |
| TODO (defer) | Reset password | — | kids-api chưa có forgot/reset → UI hướng dẫn liên hệ trường. Bổ sung khi backend có luồng. |

---

## DANH SÁCH TASK INTEGRATE (theo domain)

### 1. Students / Children — *lõi chung 2 role*
| Status | Màn | Role | Endpoint kids-api | cURL |
| --- | --- | --- | --- | --- |
| DONE | ChildrenListPage `/parent/children` | PH | `GET /students/mine` | Pass 2026-06-27: login PH `0901000001` host `demo.kimthanhkids.vn` → 1 child, có `classroom/dateOfBirth/status`. |
| DONE | StudentDetailPage `/{role}/student/:id` | PH/GV | `GET /students/:id` (staff) · với PH lấy từ `/students/mine` | Pass 2026-06-27: PH detail đọc từ `/students/mine`; GV `0909000010` gọi `/students/:id` → có `parents/classroom`. |
| DONE | ClassRosterPage `/teacher/class` | GV | `GET /classrooms` + `GET /students` | Pass 2026-06-27: GV `0909000010` → `/classrooms` 3 lớp; `/students?classroomId=<id>` 4 học sinh lớp đầu. |

### 2. Attendance
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | AttendanceMarkPage `/teacher/attendance` | GV | `POST /attendance/mark` · `GET /attendance` | Pass 2026-06-27: GV `0909000010` mark 4 entries (`marked=4, skipped=0`) rồi `GET /attendance?classroomId=&date=` trả 4 records. |
| DONE | AttendanceHistoryPage `/teacher/attendance/history` | GV | `GET /attendance` | Pass 2026-06-27: GV `0909000010` gọi `/attendance` theo lớp + các ngày gần đây; ngày hôm nay có 4 records. |
| DONE | (PH xem điểm danh con) | PH | `GET /attendance/student/:studentId` | Pass 2026-06-27: PH `0901000001` gọi `/attendance/student/:studentId` cho con mình → 1 record latest `PRESENT`. |

### 3. Daily Reports
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | ReportFeedPage `/parent/reports` | PH | `GET /daily-reports/student/:studentId` | Pass 2026-06-27: PH `0901000001` gọi feed cho con mình → 1 report latest `HAPPY`. |
| DONE | ReportComposePage `/teacher/reports/new` | GV | `POST /daily-reports` · `GET /daily-reports` | Pass 2026-06-27: GV `0909000010` upsert report hôm nay; `/daily-reports?classroomId=&date=` trả 1 record. |

### 4. Medicine + Health (allergies/incidents)
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | MedicineListPage `/{role}/medicine` | PH/GV | PH `GET /medicine/mine` · GV `GET /medicine?status=` | Pass 2026-06-27: PH `0901000001` list mine → 1 request; GV `0909000010` list pending → 2 requests. |
| DONE | MedicineCreatePage `/parent/medicine/new` | PH | `POST /medicine` | Pass 2026-06-27: PH tạo request `cURL Vitamin C` → status `PENDING`. |
| DONE | MedicineDetailPage `/{role}/medicine/:id` | PH/GV | `GET /medicine/:id` | Pass 2026-06-27: PH đọc detail request mới → có `history=1`; GV detail dùng cùng endpoint. |
| DONE | MedicineApprovePage `/teacher/medicine/approve` | GV | `POST /medicine/:id/handle` | Pass 2026-06-27: GV handle `APPROVED` rồi `ADMINISTERED` → status cập nhật đúng. |
| DONE | (cảnh báo dị ứng) | GV | `GET /allergies/student/:studentId` · `GET /incidents/student/:studentId` | Pass 2026-06-27: GV gọi theo học sinh PH test → allergies 1 record, incidents trả array hợp lệ. |

### 5. Tuition (học phí / thanh toán)
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | InvoicesPage `/parent/invoices` | PH | `GET /tuition/invoices/mine` | Pass 2026-06-27: PH `0901000001` → 1 invoice, due=1, detail `HD-2026-0001`. |
| DONE | PaymentCheckoutPage `/parent/payment` | PH | `GET /tuition/invoices/:id/vietqr` · `POST /tuition/invoices/:id/pay/gateway` | Pass 2026-06-27: VietQR amount `2670000`, gateway tạo `paymentId` + VNPay sandbox redirect. |

### 6. Leave (xin nghỉ)
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | LeaveRequestPage `/parent/leave` | PH | `GET /leave/mine` · `POST /leave` | Pass 2026-06-27: PH `0901000001` tạo đơn `SICK` hôm nay → `PENDING`; list mine trả 1 request. |

### 7. Announcements + Notifications
| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | AnnouncementsPage `/{role}/announcements` | PH/GV | PH/GV feed `GET /announcements/feed` · GV list `GET /announcements` | Pass 2026-06-27: GV `0909000010` list 3 items; PH `0901000001` feed 2 visible items theo lớp/con. |
| DONE | AnnouncementComposePage `/teacher/announcements/new` | GV | `POST /announcements` | Pass 2026-06-27: GV tạo announcement `CLASS`, `publish=true` → có `publishedAt`. |
| DONE | NotificationsPage `/{role}/notifications` | PH/GV | `GET /notifications` · `GET/PATCH /notifications/preferences` · `POST /notifications/read-all` | Pass 2026-06-27: PH list 4 notifications, preferences 7 types, patch preference OK, read-all updated 4. |

### 8. Còn lại
> Lưu ý: `/dashboard` chỉ cho `SCHOOL_ADMIN/PRINCIPAL` → home GV/PH **compose** từ endpoint role truy cập được (đã cURL-pass ở domain trước), không gọi /dashboard.

| Status | Màn | Role | Endpoint | cURL |
| --- | --- | --- | --- | --- |
| DONE | ParentHomePage `/parent` | PH | compose `useMe` + `/students/mine` + `/announcements/feed` + `/tuition/invoices/mine` | Dùng endpoint đã verify; build pass. Greeting từ `me.fullName`, bỏ số liệu bịa. |
| DONE | TeacherHomePage `/teacher` | GV | compose `useMe` + `/classrooms` + `/medicine?status=PENDING` | Lớp + pending thuốc thật; bỏ số liệu bịa. |
| DONE | MenuWeeklyPage `/parent/menu` | PH | `GET /menus` → `GET /menus/:id` | Pass 2026-06-28: list 1 menu → detail 10 meals (sample LUNCH "Cơm gà, canh rau ngót"), nhóm theo weekday. |
| DONE | AlbumGalleryPage `/{role}/album` | PH/GV | `GET /albums` → `GET /albums/:id` · `GET /media/:id/file` (AuthImage fetch blob + Bearer) | Pass 2026-06-28: list 1 album (_count.photos=1) → detail 1 photo. **Media file 400 `ENOENT demo-photo.webp`** — seed thiếu binary, AuthImage fallback "—" (không phải lỗi code). |
| DONE | LessonPlanPage `/teacher/lesson-plan` | GV | `GET /lesson-plans` → `GET /lesson-plans/:id` | Pass 2026-06-28: list 1 plan "Thế giới động vật" → detail 2 activities. |
| DONE | ProfilePage (thật) | PH/GV | `GET /auth/me` (đã thêm `fullName`/`phone`) | Pass: hiển thị tên/SĐT thật từ me, bỏ mock. |

---

## Auth hardening (sau khi integrate xong domain)

| Status | Task | Ghi chú |
| --- | --- | --- |
| DONE | Backend `/auth/me` thêm `fullName` + `phone` | `current-user.decorator` + `user-context.service`; cURL pass (`"fullName":"Phụ huynh bé An","phone":"0901000001"`). API.md đã sync. |
| DONE | Verify role khi reload sâu | `RoleGuard` (App.tsx) dùng `useMe()`: chưa login → /login; role không khớp khu vực (PH mở `/teacher/*`) → điều hướng về home đúng role; vai trò không hỗ trợ → /login. |
| DONE | Refetch `me` lúc khởi động | `useMe()` (react-query, staleTime 5') fetch khi mở app/reload → khôi phục role/tenant. |
| DONE | Dọn mockData | `mobileState` bỏ `students/attendance` mock (chỉ còn `role` + `selectedStudentId`); `mockData` chỉ còn dùng cho `assets` (ảnh tĩnh) ở Login/Profile. |

> Cập nhật file này NGAY trong task khi đổi trạng thái. Endpoint/DTO chính xác được xác minh bằng cURL trong từng task (controller đã tồn tại ở kids-api Phase 1 A→G).

---

## Review trước Codex (2026-06-28)

| Status | Hạng mục | Ghi chú |
| --- | --- | --- |
| DONE | Rà toàn bộ api module + ~24 page | invalidation nhất quán sau mutation; loading/error/empty đủ 3 nhánh; role-gating đúng; quyền API khớp (teacher ∈ COMPOSERS; `allergies/incidents/student/:id` cho PARENT). **Không bug nghiêm trọng.** |
| DONE | Fix: `StudentDetailPage` | Chỉ fetch `useAllergies/useIncidents` khi `isTeacher` (khối sức khỏe chỉ hiển thị cho GV) → bỏ gọi API thừa cho PH. |
| DONE | Verify cuối | `pnpm build` (tsc+Vite) xanh · dict parity **302/302** · cURL từng domain pass. |
| — | Lưu ý seed | Album media trả 400 (`ENOENT demo-photo.webp`) do seed thiếu file nhị phân — không phải lỗi code; `AuthImage` fallback "—". |

> Kịch bản e2e chi tiết: `FE_TEST_SCENARIOS.md`. Ý tưởng CRM tương quan: `kids-crm/CRM_FEATURE_IDEAS.md`.
