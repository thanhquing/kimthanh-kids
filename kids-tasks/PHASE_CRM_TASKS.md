# Phase CRM — `kids-crm` (web quản trị trường)

> **Mục tiêu:** dựng CRM tenant cho chủ trường/hiệu trưởng/nhân sự vận hành trọn vẹn 1 ngày học thật: cấu hình trường -> lớp/học sinh/nhân sự -> điểm danh/báo cáo -> sức khỏe/thuốc/sự cố -> học phí/VietQR -> thông báo -> audit.
>
> **Nguyên tắc:** làm theo đúng quy trình đã dùng cho `kids-platform`: **mock HTML -> BE/API/cURL -> UI -> tích hợp API -> seed + self-test vận hành dev**. Nếu context/token hết, agent kế tiếp tiếp tục từ checklist này, không tự đổi phạm vi.

## 0. Trạng thái hiện tại

- `kids-api` Phase 0 + Phase 1 đã đóng, 114 e2e / 13 suite ở mốc API.
- Ledger CRM trong [`UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md) đã PASS **49/49** flow chủ trường, fixture `crm1782232197.kimthanhkids.vn`.
- `kids-platform` đã có pattern cần copy: Vite + React + TypeScript + Tailwind + TanStack Query, `src/api/http.ts` bóc envelope, refresh token, invalidate query theo nhóm.
- `kids-crm/` đã bootstrap source bằng copy-first từ `kids-platform`: app shell, đăng nhập realm tenant (login/me/refresh + guard chặn tài khoản platform) và **placeholder routes** cho toàn bộ module. Tích hợp business API (dashboard/settings/…) **chưa làm** — đã chủ động gỡ wiring tạm thời để commit baseline sạch; sẽ ráp lại từng màn theo Quy trình bắt buộc (tầng `src/api/http.ts` giữ nguyên).
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
  - [x] dev proxy giữ `Host: demo.kimthanhkids.vn` hoặc host tenant hiện tại.
  - [x] bóc `{ success:true, data, meta? }`.
  - [x] throw `ApiError(code,message,status)` khi `{ success:false }`.
  - [x] `401 -> refresh -> retry once -> logout`.
- [x] Auth store: accessToken + refreshToken trong `localStorage` có chủ đích.
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
- [ ] Settings: _(route placeholder; wiring `GET/PATCH /tenant/settings` đã gỡ — nhớ omit field rỗng vì zod `.optional()` từ chối `""`)_
  - [ ] xem/sửa thông tin trường.
  - [ ] branding cơ bản.
  - [ ] cấu hình ngân hàng/MST/địa chỉ hóa đơn.
- [ ] Classrooms:
  - [ ] list/search/filter.
  - [ ] create/edit.
  - [ ] detail roster.
  - [ ] quota message khi vượt gói.
- [ ] Students/Guardians:
  - [ ] list/filter theo lớp.
  - [ ] create/edit/detail.
  - [ ] link/unlink guardian nếu API hỗ trợ.
  - [ ] trạng thái và soft-delete nếu đã có endpoint.
- [ ] Members:
  - [ ] create teacher/nurse/finance/parent.
  - [ ] activate/deactivate.
  - [ ] role badges.
- [ ] Attendance:
  - [ ] chọn lớp/ngày.
  - [ ] bulk mark.
  - [ ] xem bảng theo lớp/ngày.
- [ ] Daily reports:
  - [ ] soạn/upsert theo học sinh hoặc lớp.
  - [ ] list theo lớp/ngày.
- [ ] Health/medicine/incidents:
  - [ ] health records + growth.
  - [ ] allergies.
  - [ ] medicine list/handle timeline.
  - [ ] incidents list/create.
- [ ] Tuition:
  - [ ] invoice list/detail/create.
  - [ ] VietQR.
  - [ ] manual cash payment.
  - [ ] print HTML.
  - [ ] export CSV.
- [ ] Announcements:
  - [ ] compose/draft.
  - [ ] publish.
  - [ ] feed.
- [ ] Assignments:
  - [ ] create weekly assignment.
  - [ ] list/mine.
- [ ] Audit log:
  - [ ] list/filter action.

## 3. Seed data + dev vận hành

- [ ] Dùng `pnpm prisma:seed:demo` để có tenant `demo` gói PRO đủ dữ liệu.
- [ ] CRM dev chạy với host `demo.kimthanhkids.vn`:

```bash
127.0.0.1 demo.kimthanhkids.vn
```

- [ ] Vite proxy CRM phải set `Host: demo.kimthanhkids.vn` khi gọi API local nếu chạy qua `localhost`.
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

- [x] `pnpm build` sạch sau bootstrap CRM.
- [ ] `pnpm gen:api` chưa chạy lại sau bootstrap vì API không đổi; generated type copy từ baseline hiện có.

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
