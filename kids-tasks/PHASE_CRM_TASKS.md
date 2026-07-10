# Phase CRM — `kids-crm` (web quản trị trường)

> **Mục tiêu:** dựng CRM tenant cho chủ trường/hiệu trưởng/nhân sự vận hành trọn vẹn 1 ngày học thật: cấu hình trường -> lớp/học sinh/nhân sự -> điểm danh/báo cáo -> sức khỏe/thuốc/sự cố -> học phí/VietQR -> thông báo -> audit.
>
> **Nguyên tắc:** làm theo đúng quy trình đã dùng cho `kids-platform`: **mock HTML -> BE/API/cURL -> UI -> tích hợp API -> seed + self-test vận hành dev**. Nếu context/token hết, agent kế tiếp tiếp tục từ checklist này, không tự đổi phạm vi.

## 0. Trạng thái hiện tại

- `kids-api` Phase 0 + Phase 1 đã đóng; inventory hiện tại 165 e2e / 18 suite (xem `ARCHITECTURE.md`). Lần verify gần nhất: `tsc` + `lint` + `test:e2e` sạch (165/18) trên NestJS 11/Express 5.
- Ledger CRM trong [`UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md) đã PASS **49/49** flow chủ trường, fixture `crm1782232197.kimthanhkids.vn`.
- `kids-platform` đã có pattern cần copy: Vite + React + TypeScript + Tailwind + TanStack Query, `src/api/http.ts` bóc envelope, refresh token, invalidate query theo nhóm.
- `kids-crm/` đã bootstrap source bằng copy-first từ `kids-platform`: app shell, đăng nhập realm tenant (login/me/refresh + guard chặn tài khoản platform).
- **Đã tích hợp (toàn bộ mục nav P0/P1):** Dashboard · Hồ sơ (Lớp/Học sinh/Nhân sự) · Điểm danh · Sổ liên lạc · Sức khỏe (thuốc/sự cố/đo lường/dị ứng) · Học phí (HĐ/chi tiết/VietQR/thu tiền/in/hủy) · Thông báo · Nhật ký · Cài đặt trường. Tất cả qua `src/api/crm.ts`, i18n VI/EN đầy đủ, bám mock `web/*.html`.
- Tinh chỉnh BE phục vụ mock: thêm `phone` vào `/tenant/members`, `parents` vào `GET /students`, reset mật khẩu nhân sự và pickup/check-in/out. Verify gần nhất: `pnpm build` CRM sạch · `kids-api pnpm exec tsc --noEmit` + `pnpm lint` sạch · smoke cURL 16 endpoint (3 mutate + 13 GET) trả 200/khớp shape; e2e full cần chạy lại khi DB local sẵn.
- **Mở rộng `CRM_FEATURE_IDEAS.md` đã nối UI/API:** Assignments (phân công), Leave (duyệt nghỉ), Weekly menu + allergy warnings, Notifications feed/preferences, Album/upload, Lesson plan, reset mật khẩu nhân sự, quản lý người đón/nhật ký CHECK_IN/CHECK_OUT. Còn cần smoke test dev đầy đủ khi Docker/Postgres local hoạt động.
- **Quyết định triển khai:** `kids-crm` đi theo hướng **copy-first từ `kids-platform`**, rồi đổi realm/API/page theo CRM. Không scaffold trắng nếu không cần.

## 1. Phạm vi sản phẩm

### P0 — MVP vận hành thật

- Login tenant realm, refresh token, route guard, layout theo role.
- Dashboard: KPI vận hành từ `GET /dashboard/summary`.
- Cài đặt trường: thông tin, branding, tài khoản ngân hàng để VietQR hoạt động.
- Lớp học: list/detail/tạo/sửa, hiển thị sĩ số, GVCN, quota.
- Học sinh: list/detail/tạo/sửa, gán phụ huynh.
- Nhân sự: tạo tài khoản trực tiếp, bật/tắt trạng thái.
- Điểm danh: chọn lớp/ngày, điểm danh hàng loạt.
- Học phí: tạo/list/detail hóa đơn, VietQR, thu tiền mặt, in HTML, export CSV.
- Thông báo: soạn, nháp, publish, feed.
- Audit log: xem các hành động nhạy cảm.

### P1 — Đủ sâu cho vận hành hằng ngày

- Báo cáo ngày/sổ liên lạc.
- Sức khỏe, dị ứng, thuốc, sự cố.
- Đơn xin nghỉ + màn duyệt cho GV/admin.
- Phân công trực/tuần.
- Thực đơn tuần + cảnh báo dị ứng.
- Notifications feed + preferences.
- Tìm kiếm/lọc nâng cao, empty/loading/error states, confirm modal cho thao tác nhạy cảm.

### P2 — Sau khi P0/P1 chạy ổn

- Album ảnh (`media_gallery`) + upload.
- Lesson plan (`lesson_plan`).
- VNPay checkout thật trong CRM.
- Import học sinh hàng loạt, export nâng cao.
- Dashboard analytics nâng cao.
- Handoff impersonate từ `kids-platform` vào đúng màn CRM.

## 2. Quy trình bắt buộc

### Bước A — Mock HTML trước

Nguồn hiện có: `kids-landing/public/mock-ui/web/`.

- [x] Audit mock web hiện có: login, dashboard, classrooms, classroom-detail, students, student-profile, attendance, reports, medicine-requests, health-records, incidents, invoices, invoice-print, payments, announcements, assignments, users, settings-school, audit-log.
- [ ] Bổ sung mock HTML còn thiếu theo business goal:
  - [ ] `notifications.html`: feed thông báo, unread/read, preferences.
  - [ ] `leave-requests.html`: danh sách + duyệt/từ chối đơn nghỉ.
  - [ ] `weekly-menu.html`: thực đơn tuần + cảnh báo dị ứng.
  - [ ] `album-gallery.html`: album lớp, upload/đính ảnh đã có media.
  - [ ] `lesson-plan.html`: giáo án tuần, feature-gate theo gói.
  - [ ] `invoice-detail.html`: chi tiết hóa đơn học phí + VietQR + timeline thanh toán.
  - [ ] Các popup/modal: tạo/sửa lớp, tạo/sửa học sinh, gán phụ huynh, tạo thành viên, tạo hóa đơn, thu tiền mặt, publish thông báo, confirm hủy/xóa/tắt tài khoản.
  - [ ] States dùng chung: loading, empty, forbidden/quota, validation error.
- [ ] Khi bổ sung mock, giữ style mock hiện tại (`shared.css`, `shared.js`) và cập nhật link điều hướng trong mock nếu cần.

### Bước B — BE/API + cURL ledger

> Không thêm API nếu API hiện có đã đủ. Chỉ bổ sung endpoint khi mock/flow thật không thể làm bằng contract hiện tại.

- [x] CRM owner flow PASS 49/49 trong [`UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md).
- [x] Khi thêm mock mới, viết flow cURL trước khi code UI:
  - [x] Login + Dashboard: `/auth/login`, `/auth/me`, `/dashboard/summary` (run `1782461537`, PASS).
  - [ ] Notifications: `/notifications`, unread/read, preferences.
  - [ ] Leave requests: `/leave`, `/leave/mine`, `/:id/decide`.
  - [ ] Weekly menu: `/menus`, `/menus/:id/allergy-warnings`.
  - [ ] Album/media: `/media`, `/albums`.
  - [ ] Lesson plan: `/lesson-plans`.
  - [ ] Invoice detail/VietQR/manual payment: đối chiếu lại các endpoint học phí.
- [ ] Nếu bổ sung endpoint:
  - [ ] Sửa controller/service/DTO/e2e trong `kids-api`.
  - [ ] Cập nhật [`API.md`](../kids-documentation/API.md) và tài liệu liên quan.
  - [ ] Chạy `tsc --noEmit`, `eslint`, `test:e2e`.
  - [ ] Cập nhật ledger cURL bằng case mới, chỉ ghi PASS.

### Bước C — Scaffold UI `kids-crm`

- [x] Copy baseline từ `kids-platform` sang `kids-crm` thay vì scaffold trắng.
- [x] Giữ app độc lập, không tạo workspace/monorepo.
- [x] Dùng dependencies gần `kids-platform`: React, React Router, TanStack Query, lucide-react, Tailwind.
- [x] Đổi `package.json` name thành `kids-crm`; giữ scripts `dev`, `build`, `preview`, `gen:api`.
- [x] Copy các file gần như nguyên:
  - [x] `src/api/http.ts` (đổi comment/host/token key nếu cần).
  - [x] `src/api/auth.ts` (đổi validation realm tenant).
  - [x] `src/lib/queryClient.ts`, `utils.ts`, `labels.ts`, `vietqr.ts`, `numToWords.ts`.
  - [x] `src/components/PageHeader.tsx`, `components/ui/Modal.tsx`, `components/ui/Toast.tsx`.
  - [x] `src/main.tsx`, `src/index.css`, Tailwind/PostCSS/TS/Vite config.
- [x] Copy rồi sửa mạnh:
  - [x] `src/App.tsx`: route CRM thay route platform.
  - [x] `src/components/AppLayout.tsx`: nav theo tenant roles, không còn platform nav.
  - [x] `src/pages/LoginPage.tsx`: text/branding CRM, login tenant realm.
  - [x] `src/api/platform.ts` -> đổi thành `src/api/crm.ts` với endpoint tenant/domain.
- [x] Không copy page platform không liên quan: tenants, plans, coupons, subscriptions, worklist, observability platform.
- [x] Chốt UI library cho CRM bảng/form:
  - Đề xuất: **Mantine** nếu cần form/table/modal nhanh.
  - **Đang chọn hướng nhẹ như platform:** Tailwind + component tự viết, bổ sung modal/form/table states theo từng màn.
- [x] Thêm `.gitignore`: `node_modules`, `dist`, `.env`, `.env.local`.
- [x] Copy type sinh từ OpenAPI vào `src/api/generated/` bằng `pnpm gen:api`/baseline copy.

### Bước D — App shell + client API

- [x] `src/api/http.ts`:
  - [x] `baseUrl` mặc định `/api`.
  - [x] gắn `Authorization: Bearer`.
  - [x] gắn `x-language` theo lựa chọn VI/EN trong CRM.
  - [x] dev proxy **không ghim Host tenant**; tenant chọn ở login và gửi `x-tenant`, JWT điều khiển scope sau login.
  - [x] bóc `{ success:true, data, meta? }`.
  - [x] throw `ApiError(code,message,status)` khi `{ success:false }`.
  - [x] `401 -> refresh -> retry once -> logout`.
- [x] Auth store: accessToken + refreshToken trong `localStorage` có chủ đích. _(Cập nhật vòng 14 bảo mật: refresh token → cookie `HttpOnly`, access token in-memory; bỏ localStorage.)_
- [x] QueryClient + toast/error boundary.
- [x] Layout:
  - [x] sidebar desktop, bottom/nav compact mobile.
  - [x] menu theo role.
  - [x] route guard tenant realm, chặn platform token nếu dùng sai app.
  - [x] `AccountPanel` ở **top sidebar** (dưới brand): account card (avatar/tên/role + nút đăng xuất), toggle VI/EN dạng segmented + chuông thông báo. Dùng chung cho cả mobile "Thêm" sheet → toggle ngôn ngữ là global mọi màn (PageHeader giờ chỉ còn breadcrumb + search).
- [x] Header VI/EN đổi ngôn ngữ CRM và request header `x-language`; API trả `error.message` theo ngôn ngữ cho lỗi phổ biến.
- [x] i18n FE app: dictionary `src/i18n/vi.json` + `en.json` (parity 90 key), translator nhẹ `src/i18n/index.ts` (`useT()` reactive qua `languageStore` + `t()` non-reactive, hỗ trợ `{n}` interpolation). Đã localize toàn bộ text màn hiện có: Login, Dashboard, AppLayout (nav/group/account), PageHeader, PlaceholderPage. **Quy ước: màn mới phải dùng `t()/useT()` và thêm key vào CẢ HAI dict — không hardcode chuỗi.**
- [ ] Error mapping fallback theo `error.code` cho case chưa localize: quota, feature gate, `NO_BANK_CONFIG`, `NOT_FOUND`.

### Bước E — UI theo mock HTML

Làm từng cụm, mỗi cụm có mock -> component -> API integration -> self-test.

- [x] Auth/Login:
  - [x] Login page.
  - [x] "Quên mật khẩu?" mở modal hướng dẫn theo tổ chức tenant (không gọi email/reset API ở P0).
  - [x] Logout.
  - [x] Refresh token.
  - [x] `/auth/me`.
- [x] Dashboard:
  - [x] KPI tổng quan theo mock `dashboard.html`.
  - [x] trend điểm danh 30 ngày, thuốc tháng này, doanh thu 6 tháng, thông báo gần đây.
  - [x] tích hợp `GET /dashboard/summary` + cURL PASS.
- [x] Settings (`SettingsPage`): _(patch chỉ gửi field non-empty — zod `.optional()` từ chối `""`)_
  - [x] thông tin trường (read-only từ School: tên/mã/địa chỉ/SĐT — chưa có endpoint update School).
  - [x] branding: displayName, logoUrl, primaryColor/secondaryColor, supportEmail.
  - [x] cấu hình ngân hàng (chọn từ BANKS)/MST/địa chỉ hóa đơn → `PATCH /tenant/settings`.
- [x] Classrooms (`ClassroomsPage` + `ClassroomDetailPage`):
  - [x] list + search theo tên + summary "{lớp} · {HS} · {GV}".
  - [x] create/edit (modal): tên, độ tuổi, sức chứa, GVCN (chọn từ members role TEACHER).
  - [x] detail roster (tab Học sinh) + stats Sĩ số/Sức chứa/Còn trống; các tab khác = coming soon.
  - [x] soft-delete (confirm modal) → `DELETE /classrooms/:id`.
  - [x] quota khi vượt gói: backend trả 403 `QUOTA_EXCEEDED`, FE hiển thị `error.message` qua toast.
- [x] Students/Guardians (`StudentsPage` + `StudentProfilePage`):
  - [x] list + filter theo lớp/giới tính + search + export CSV.
  - [x] create/edit (modal) + detail (profile) + soft-delete.
  - [x] link/unlink guardian trên profile (`POST/DELETE /students/:id/guardians`).
  - [x] cột Phụ huynh ở list/roster: thêm `parents` vào `GET /students` include (đồng bộ với `get`).
- [x] Members (`MembersPage`):
  - [x] create GV/y tá/kế toán/phụ huynh (modal, SĐT/email + mật khẩu mặc định).
  - [x] activate/deactivate (confirm) → `PATCH /tenant/members/:userId/status`.
  - [x] role badges + filter vai trò/trạng thái + search + phân trang client + export CSV + xem chi tiết.
  - [x] cột SĐT: thêm `phone` vào `GET /tenant/members` include (login bằng SĐT).
- [x] Attendance (`AttendancePage`):
  - [x] chọn lớp/ngày.
  - [x] bulk mark (4 trạng thái + giờ đến + ghi chú) → `POST /attendance/mark`.
  - [x] KPI có mặt/muộn/vắng/phép + nạp lại bản ghi đã có theo lớp/ngày.
- [x] Daily reports (`ReportsPage`):
  - [x] chọn lớp → danh sách học sinh → feed báo cáo (`GET /daily-reports/student/:id`).
  - [x] soạn báo cáo (mood/meals/nap/activities/note) → `POST /daily-reports`.
  - [x] mobile GV đính kèm ảnh báo cáo ngày (`photoIds` từ media upload); PH xem ảnh trong feed.
- [x] Health/medicine/incidents (`HealthPage`, 4 tab):
  - [x] hồ sơ đo lường theo học sinh (`GET /health/student/:id`, `POST /health`).
  - [x] dị ứng theo học sinh (`GET/POST/DELETE /allergies`).
  - [x] medicine list + handle (duyệt/từ chối/đã cho uống) → `POST /medicine/:id/handle`.
  - [x] incidents list (card) + create → `POST /incidents`.
- [x] Tuition (`TuitionPage` + `TuitionInvoiceDetailPage`):
  - [x] invoice list (KPI + filter trạng thái/search) + detail + create (modal nhiều khoản).
  - [x] VietQR (modal, dựng ảnh img.vietqr.io từ `GET /tuition/invoices/:id/vietqr`).
  - [x] manual cash/bank payment → `POST /tuition/invoices/:id/pay/manual`.
  - [x] print HTML (fetch kèm auth → window mới + print) + cancel.
  - [x] tab Thanh toán (suy ra từ HĐ đã thu). _(export CSV server-side `/export` chưa nối — dùng client-side ở list khác; bổ sung sau nếu cần)_
- [x] Announcements (`AnnouncementsPage`):
  - [x] compose/draft (modal: audience/lớp/tiêu đề/nội dung).
  - [x] publish (`POST /announcements/:id/publish`) + delete.
  - [x] master-detail list + filter audience/search.
- [x] Assignments (`AssignmentsPage`):
  - [x] create weekly assignment.
  - [x] list/filter theo nhân sự/lớp/thứ + delete.
- [x] Leave requests (`LeaveRequestsPage`):
  - [x] list/filter trạng thái.
  - [x] approve/reject kèm ghi chú.
- [x] Weekly menu (`MenusPage`):
  - [x] create menu nhiều bữa.
  - [x] detail + allergy warnings theo học sinh + delete.
- [x] Album/upload (`AlbumsPage`):
  - [x] create album lớp/toàn trường.
  - [x] upload media + attach photos.
- [x] Lesson plan (`LessonPlansPage`):
  - [x] create weekly lesson plan + activities.
  - [x] list/detail/delete.
- [x] Notifications feed (`NotificationsPage`):
  - [x] feed cá nhân + mark read/all-read.
  - [x] preferences theo notification type.
- [x] Reset password:
  - [x] `PATCH /tenant/members/:userId/password` + CRM action trong `MembersPage`.
- [x] Pickup / drop-off (`PickupPage` + `pickup` API):
  - [x] danh sách người được phép đón theo học sinh.
  - [x] revoke người đón.
  - [x] ghi nhật ký CHECK_IN/CHECK_OUT.
- [x] Audit log (`AuditPage`):
  - [x] list + filter prefix action (member/invoice/student) + resolve tên actor qua members.

## 3. Seed data + dev vận hành

- [ ] Dùng `pnpm prisma:seed:demo` để có tenant `demo` gói PRO đủ dữ liệu.
- [ ] CRM dev có thể chạy bằng `localhost:5173` (tenant chọn qua dropdown) hoặc host `demo.kimthanhkids.vn` nếu muốn kiểm tra subdomain:

```bash
127.0.0.1 demo.kimthanhkids.vn
```

- [x] Vite proxy CRM không set `Host`; login chọn tenant qua `/public/tenants` và header `x-tenant`.
- [ ] Demo login tenant:
  - Admin: `admin@hoasen.edu.vn` / `Password123`
  - Phụ huynh mẫu: `ph01@gmail.com` / `Password123`
- [ ] Không dùng platform host `admin.kimthanhkids.vn` trong CRM trừ flow impersonate handoff.

## 4. Self-test bắt buộc trước khi báo xong

### Backend/API khi có đổi API

```bash
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
cd kids-api
pnpm tsc --noEmit
pnpm lint
pnpm test:e2e
```

### CRM UI

```bash
cd kids-crm
pnpm gen:api
pnpm build
```

Kết quả gần nhất:

- [x] `kids-crm`: `pnpm gen:api` sạch (copy OpenAPI type vào 3 app).
- [x] `kids-crm`: `pnpm build` sạch.
- [x] `kids-api`: `pnpm exec tsc --noEmit` sạch.
- [x] `kids-api`: `pnpm lint` sạch.
- [ ] `kids-api`: `pnpm test:e2e` cần chạy lại khi Docker/Postgres local hoạt động; lần chạy hiện tại bị chặn do không kết nối được `localhost:5432` (`pnpm db:up` fail vì Docker daemon chưa chạy).

### Vận hành dev thủ công

- [ ] Login bằng admin demo.
- [ ] Mở dashboard, settings, classrooms, students, tuition invoices.
- [ ] Tạo lớp/học sinh trên dữ liệu test riêng hoặc tenant fixture riêng, không làm bẩn demo khi không cần.
- [ ] Tạo hóa đơn -> lấy VietQR -> ghi nhận tiền mặt -> in HTML.
- [ ] Tạo thông báo -> publish -> feed thấy đúng.
- [ ] Đăng nhập role hạn chế (teacher/finance/parent nếu có) để kiểm tra route/nút bị ẩn nhưng backend vẫn là chốt 403.

## 5. Definition of Done

- [ ] Mock HTML đầy đủ cho P0 và các popup/states cần thiết.
- [ ] cURL ledger PASS cho mọi flow mới hoặc flow bị ảnh hưởng.
- [ ] UI bám mock HTML, không tự phát minh flow trái API.
- [ ] Tất cả API calls đi qua `src/api/http.ts`, không bóc envelope rải rác.
- [ ] Lỗi hiển thị theo `error.code`, không show raw stack.
- [ ] `pnpm build` CRM sạch.
- [ ] Nếu đổi API: `tsc --noEmit` + `eslint` + `test:e2e` sạch.
- [ ] Seed demo đủ để mở CRM và demo một ngày vận hành.
- [ ] Cập nhật docs/task cùng task; không commit tự động.

## 6. Thứ tự triển khai đề xuất

1. Bổ sung mock HTML P0 còn thiếu: invoice detail/VietQR modal, create/edit modals, quota/error states.
2. ✅ Copy baseline `kids-platform` -> `kids-crm`; đổi package/app shell/auth/http route theo tenant realm.
3. ✅ Dashboard + Settings để xác nhận tenant host/auth/proxy đúng.
4. Classrooms + Students + Members.
5. Attendance + Daily reports.
6. Tuition.
7. Announcements + Audit log.
8. P1: Health/Medicine/Incidents/Leave/Menu/Notifications/Assignments polish.
9. P2: Album/Lesson plan/VNPay/import/analytics.
