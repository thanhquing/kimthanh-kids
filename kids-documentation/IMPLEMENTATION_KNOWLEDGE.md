# KimThanh Kids — Kiến thức triển khai đã DONE

> Cập nhật: 2026-07-10. Tài liệu này ghi lại phần đã hoàn tất sau khi gom/xoá các tracker task cũ. Việc còn lại nằm ở [BACKLOG.md](../kids-tasks/BACKLOG.md).

## Trạng thái tổng

- `kids-api` đã đóng Phase 0 SaaS + Phase 1 domain A->G, inventory gần nhất: 168 e2e / 18 suite, NestJS 11 trên Express 5.
- `kids-platform` đã nối API thật cho vận hành nền tảng: tenants, plans, coupons, subscriptions, invoices, public invoice, usage/audit, worklist, settings, posts CMS.
- `kids-crm` đã nối API thật cho toàn bộ module vận hành trường P0/P1 và nhiều P2: dashboard, settings, lớp, học sinh, nhân sự, điểm danh, báo cáo ngày, sức khỏe, học phí, thông báo, phân công, nghỉ phép, menu, album/upload, giáo án, notifications, pickup, audit.
- `kids-mobile-web` là React/Vite PWA cho PH/GV, API thật + i18n VI/EN + login chọn trường qua `x-tenant`.
- `kids-mobile-native` là Expo app copy-first từ mobile-web, đã port nhiều màn P0/P1 và upload ảnh native đã code; còn smoke thiết bị thật/EAS/push.
- `kids-landing` đã có pricing public, signup self-service, invoice nâng gói + VietQR, public invoice và blog động từ platform posts.

## Nền API và multi-tenant

- Backend API-first; response envelope chuẩn: success `{ success, data, meta? }`, lỗi `{ success:false, error:{ code, message } }`.
- Tenant resolve theo SILO -> Host -> `x-tenant` -> JWT. CRM/mobile login bằng dropdown `/public/tenants` và gửi `x-tenant`, không phụ thuộc subdomain trong dev.
- Code tenant dùng `prisma.db`; code platform/auth/cron dùng `prisma.system` kèm filter tường minh.
- `findUnique/update/delete` theo PK không tự inject `tenantId`; service phải `findFirst`/assert scope trước khi thao tác.
- Model domain có `tenantId` + `schoolId` và nằm trong `TENANT_KEY`.
- Query params dùng `ZodValidationPipe` để lỗi kiểu trả 400 thay vì Prisma 500.

## Domain Phase 1

- Hồ sơ/lớp/nhân sự: Students, StudentParent, Classrooms, tenant members, staff assignments, quota STUDENTS/CLASSROOMS/TEACHERS/ADMIN_USERS.
- Vận hành hằng ngày: Attendance bulk theo lớp/ngày, DailyReports upsert theo học sinh/ngày, PH xem feed con mình.
- Sức khỏe: HealthRecord/growth, MedicineRequest + status history, Incident, Allergy, LeaveRequest.
- Học phí trường -> phụ huynh: TuitionInvoice/Item/Payment, số hóa đơn `HD-YYYY-NNNN`, VietQR miễn phí, tiền mặt/chuyển khoản thủ công, VNPay sandbox, HTML print, CSV export, cron quá hạn.
- Nội dung/giao tiếp: Announcements, WeeklyMenu + allergy warnings, LessonPlan feature-gate `lesson_plan`, Album feature-gate `media_gallery`.
- Notifications: `NotificationsService.notify`/`notifyStudentParents` là điểm phát duy nhất; in-app feed + preferences đã có, push để P2.
- Dashboard/audit/usage: `GET /dashboard/summary`, `AuditLog`, `GET /audit-logs`, `UsageEvent` login và `GET /platform/usage/overview`.

## Platform và landing

- Platform realm tách tenant realm; host dev platform ghim `admin.*`.
- Platform invoice có public token để xem invoice không cần login; mark-paid thủ công là nguồn kích hoạt gói trả phí trong MVP.
- Signup landing luôn tạo tenant Free ACTIVE trước. Nếu chọn gói trả phí, hệ thống tạo invoice nâng cấp OPEN; mark-paid mới đổi subscription/entitlements.
- Blog landing không còn hardcode: `PlatformPost` CRUD/publish trong `kids-platform`, public posts cho landing.
- Auto đối soát ngân hàng, payment gateway production và lead/contact API là backlog P2.

## Frontend patterns

- Các app FE độc lập, không workspace/monorepo; root `package.json` chỉ là script tiện ích.
- `openapi.json` từ `kids-api` là nguồn type chung; `pnpm gen:api` sinh/copy type sang app.
- Mỗi app giữ `src/api/http.ts` riêng: bóc envelope, gắn auth, refresh 401 một lần, thêm `x-language`, riêng CRM/mobile thêm `x-tenant`.
- TanStack Query dùng cho server-state; mutation invalidate theo nhóm query.
- i18n VI/EN dùng dictionary trong từng app; màn mới phải thêm key cả hai ngôn ngữ.
- Web refresh token đã chuyển sang cookie `HttpOnly` + access in-memory theo vòng security hardening; native dùng SecureStore/MMKV.
- PWA service worker không cache `/api/*` hoặc request có `Authorization`.

## CRM/mobile khép vòng nghiệp vụ

- CRM là nguồn vận hành cho mobile: cấp tài khoản/SĐT, xếp lớp, gán PH, tạo hóa đơn, soạn menu/lesson/album, duyệt thuốc/nghỉ, ghi pickup.
- Mobile PH xem con, điểm danh, báo cáo, sức khỏe, học phí, VietQR/VNPay sandbox, thuốc, nghỉ phép, thông báo, menu, album.
- Mobile GV xem lớp, điểm danh, soạn báo cáo kèm ảnh, thông báo lớp, duyệt thuốc/nghỉ, xem giáo án/album/menu.
- Reset mật khẩu self-service chưa có email/SMS infra; CRM đã có admin reset mật khẩu nhân sự/phụ huynh.

## Kiểm thử và verify

- E2E API hiện có 18 suite trong `kids-api/test`, gồm auth/RBAC, billing, isolation, domain, media, landing self-service, pickup, tuition, observability.
- Ledger cURL cũ đã xác minh 127 flow mock UI và các domain mobile/CRM chính; phần chi tiết được hấp thụ vào trạng thái DONE ở tài liệu này.
- Trước khi báo xong khi đổi code API: `pnpm exec tsc --noEmit`, `pnpm lint`, `pnpm test:e2e`.
- Với FE: chạy build tương ứng và smoke theo `kids-mobile-web/FE_TEST_SCENARIOS.md` hoặc checklist release trong `kids-tasks/BACKLOG.md`.

## Không được quảng bá như đã có

- Chat realtime đã loại khỏi kế hoạch.
- Push FCM/Expo, reset mật khẩu qua email/SMS, auto đối soát VietQR, MoMo/ZaloPay production, analytics nâng cao, app store release, VAT điện tử đều là backlog/P2+.
