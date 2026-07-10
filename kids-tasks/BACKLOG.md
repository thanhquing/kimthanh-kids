# KimThanh Kids — Backlog hợp nhất

> Cập nhật: 2026-07-10. File này là backlog thực thi duy nhất sau khi xoá các tracker phase đã DONE.
>
> Cách dùng: làm từ trên xuống. Mỗi task ghi rõ repo owner, file cần đọc/sửa, đầu ra phải có và lệnh kiểm. Không tự suy đoán phạm vi: nếu task có dòng **Blocked input**, chỉ làm sau khi dữ liệu đó được cung cấp.
>
> Nguồn DONE: [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md). Checklist audit gốc: [SECURITY_AUDIT_CHECKLIST.md](../kids-documentation/SECURITY_AUDIT_CHECKLIST.md), [SYSTEM_TEST_CHECKLIST.md](../kids-documentation/SYSTEM_TEST_CHECKLIST.md).

## Quy tắc cho mọi task

- Khi đổi API route/controller/DTO: sửa `kids-documentation/API.md`, chạy `kids-api` typecheck/lint/e2e.
- Khi đổi model/enum/index: sửa `kids-documentation/DATABASE_ERD.md`, chạy Prisma generate/migration/test tương ứng.
- Khi đổi billing/quota/feature: sửa `kids-documentation/BILLING.md` và business docs nếu ảnh hưởng sales.
- Khi đổi FE copy: cập nhật i18n VI/EN cùng lúc; không hardcode text mới.
- Khi task hoàn tất: tick task trong file này, ghi bằng chứng kiểm ở dòng `Evidence`.

## 1. Smoke và đồng bộ cấu hình dev

### BL-001 — Seed demo và kiểm login demo

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/prisma/seed-demo.ts`, `kids-api/README.md`, [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md)
- **Làm:**
  - Chạy Postgres dev bằng `cd kids-api && pnpm db:up`.
  - Chạy migration/seed nếu DB trống: `pnpm prisma:deploy`, `pnpm prisma:seed`, `pnpm prisma:seed:demo`.
  - Start API: `pnpm start:dev`.
  - Login qua API với tenant demo bằng ít nhất 3 tài khoản: `admin@hoasen.edu.vn`, `co.mai@hoasen.edu.vn`, `ph01@gmail.com` hoặc số điện thoại tương ứng.
- **Done khi:** login trả token + `/auth/me` đúng role/tenant; `GET /public/tenants` có tenant `demo`.
- **Evidence:** ghi command + response tóm tắt vào dòng này.

### BL-002 — Smoke CRM theo dữ liệu demo

- **Owner:** `kids-crm`
- **Đọc trước:** `kids-crm/README.md`, `kids-crm/src/App.tsx`, `kids-crm/src/api/crm.ts`
- **Làm:**
  - Chạy API từ BL-001.
  - Chạy `cd kids-crm && pnpm dev`.
  - Login tenant demo qua dropdown `/public/tenants`.
  - Mở và kiểm các route: `/`, `/settings`, `/classrooms`, `/students`, `/members`, `/attendance`, `/reports`, `/health`, `/tuition`, `/announcements`, `/assignments`, `/leave`, `/menus`, `/albums`, `/lessons`, `/notifications`, `/pickup`, `/audit-logs`.
  - Với mỗi route, xác nhận có loading/empty/error hợp lệ và không 403 cho admin demo.
- **Done khi:** các route trên render dữ liệu hoặc empty state hợp lệ; không có request lặp vô hạn; console không có lỗi runtime.
- **Evidence:** ghi browser/terminal output tóm tắt.

### BL-003 — Smoke mobile-web theo kịch bản PH/GV

- **Owner:** `kids-mobile-web`
- **Đọc trước:** [FE_TEST_SCENARIOS.md](../kids-mobile-web/FE_TEST_SCENARIOS.md), `kids-mobile-web/src/App.tsx`, `kids-mobile-web/src/api/*.ts`
- **Làm:**
  - Chạy API từ BL-001.
  - Chạy `cd kids-mobile-web && pnpm dev`.
  - Test PH: login tenant demo -> home -> children -> student detail -> reports -> invoices -> payment QR -> medicine -> leave -> notifications -> profile logout.
  - Test GV: login tenant demo -> home -> class roster -> attendance mark -> report compose -> announcements -> medicine approve -> leave approve -> lesson plan -> notifications -> profile logout.
- **Done khi:** mọi flow trong `FE_TEST_SCENARIOS.md` có kết quả đúng hoặc lỗi nghiệp vụ rõ ràng từ API.
- **Evidence:** ghi danh sách flow PASS/FAIL và lỗi còn lại nếu có.

### BL-004 — Smoke landing self-service

- **Owner:** `kids-landing`, `kids-api`
- **Đọc trước:** `kids-landing/src/api/public.ts`, `kids-landing/src/routes/bang-gia.tsx`, `kids-landing/src/routes/dang-ky.tsx`, `kids-landing/src/routes/dang-ky.thanh-cong.tsx`, `kids-landing/src/routes/tin-tuc.tsx`, `kids-landing/src/routes/tin-tuc.$slug.tsx`, `kids-api/src/provisioning/provisioning.controller.ts`
- **Làm:**
  - Chạy API từ BL-001.
  - Chạy `cd kids-landing && pnpm dev`.
  - Kiểm `/bang-gia` đọc `GET /public/plans`.
  - Kiểm `/dang-ky` với gói Free trên tenant slug test mới.
  - Kiểm `/dang-ky` với gói trả phí tạo public invoice + VietQR.
  - Kiểm `/tin-tuc` và `/tin-tuc/:slug` đọc public posts.
  - Kiểm `/hoa-don/:token` với token từ signup paid.
- **Done khi:** các route render từ API thật, không fallback data hardcode, signup tạo tenant/invoice đúng.
- **Evidence:** ghi slug test + invoice number/public invoice result.

### BL-005 — CORS origins cho môi trường thật

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/src/config/config.schema.ts`, `kids-api/src/config/env.service.ts`, `kids-api/.env.example`
- **Làm:**
  - Thêm hướng dẫn cụ thể vào `.env.example` cho `API_CORS_ORIGINS` gồm các origin FE production/dev đang dùng: platform, CRM, mobile-web, landing.
  - Không đổi rule production hiện có: wildcard `*` vẫn phải fail-fast khi `NODE_ENV=production`.
  - Nếu có domain production thật, cập nhật README/deploy docs tương ứng.
- **Blocked input:** domain production chính thức nếu chưa có.
- **Done khi:** `.env.example` và docs nói rõ format comma-separated; production wildcard vẫn bị chặn.
- **Verify:** `cd kids-api && pnpm exec tsc --noEmit && pnpm lint`.

### BL-006 — Error code mapping FE

- **Owner:** `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`, `kids-landing`
- **Đọc trước:** `kids-api/src/common/filters/all-exceptions.filter.ts`, `kids-api/src/common/guards/subscription.guard.ts`, `kids-api/src/tuition/tuition-payment.service.ts`, từng app `src/api/http.ts`, từng app `src/i18n/{vi,en}.json`
- **Làm:**
  - Lập danh sách code tối thiểu phải map: `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, `NO_BANK_CONFIG`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_FAILED`, `INVALID_CREDENTIALS`, `TENANT_REQUIRED`, `ACCOUNT_LOCKED`, `SLUG_UNAVAILABLE`, `NO_PUBLIC_PRICE`.
  - Thêm helper map lỗi trong từng app nếu chưa có.
  - Thay các nơi show raw `error.message` không ổn định bằng message từ i18n theo `error.code`; vẫn fallback sang `error.message` khi code chưa biết.
  - Cập nhật cả VI và EN.
- **Done khi:** các app hiển thị lỗi nghiệp vụ bằng copy ổn định; không lộ stack/raw object.
- **Verify:** build từng app đã sửa; kiểm i18n parity nếu app có script/parity helper.

### BL-007 — Kiểm tra `.gitignore` và file generated/build

- **Owner:** root + mọi `kids-*`
- **Đọc trước:** `.gitignore`, `kids-api/.gitignore`, `kids-platform/.gitignore`, `kids-crm/.gitignore`, `kids-mobile-web/.gitignore`, `kids-mobile-native/.gitignore`
- **Làm:**
  - Đảm bảo ignore: `node_modules`, `dist`, `.env`, `.env.local`, `.expo`, generated `src/api/generated`, native signing/build output (`ios`, `android`, `*.jks`, `*.p8`, `*.p12`, `*.mobileprovision`).
  - Kiểm `git status --ignored --short` để biết file generated/build nào đang bị track nhầm.
  - Nếu đang track nhầm build/cache, dừng và hỏi trước khi xoá khỏi git index; không tự dùng lệnh destructive.
- **Done khi:** không có build/cache/env/signing material mới bị track.
- **Evidence:** ghi output `git status --short` sau kiểm.

## 2. Kiểm thử release tự động hoá

### BL-008 — Verify backend đầy đủ

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/package.json`, `kids-api/test/jest-e2e.json`, `kids-api/test/*.e2e-spec.ts`
- **Làm:**
  - Chạy `cd kids-api && pnpm db:up`.
  - Chạy `pnpm exec tsc --noEmit`.
  - Chạy `pnpm lint`.
  - Chạy `pnpm test:e2e`.
  - Nếu fail do Docker/Postgres không chạy, ghi rõ lỗi hạ tầng; không sửa code khi chưa có lỗi code cụ thể.
- **Done khi:** typecheck/lint/e2e sạch.
- **Evidence:** paste số suite/test pass.

### BL-009 — Verify build/lint FE

- **Owner:** `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-landing`, `kids-mobile-native`
- **Đọc trước:** root `package.json`, từng app `package.json`
- **Làm:**
  - Chạy `pnpm build:platform`.
  - Chạy `pnpm build:crm`.
  - Chạy `pnpm build:mobile-web`.
  - Chạy `pnpm build:landing`.
  - Chạy `cd kids-landing && pnpm lint`.
  - Chạy native typecheck/lint đúng script hiện có trong `kids-mobile-native/package.json`; nếu script thiếu thì ghi `N/A` và thêm task nhỏ tạo script trước khi test.
- **Done khi:** build/lint sạch hoặc lỗi được ghi thành task cụ thể trong backlog.
- **Evidence:** ghi command output tóm tắt.

### BL-010 — Playwright smoke CRM

- **Owner:** `kids-crm`
- **Đọc trước:** `kids-crm/src/App.tsx`, `kids-crm/src/pages/*.tsx`, `kids-crm/package.json`
- **Làm:**
  - Thêm dependency/script Playwright nếu app chưa có.
  - Tạo test login tenant demo và route smoke cho các trang ở BL-002.
  - Test phải dùng API thật local + seed demo, không mock network.
  - Test không mutate demo bẩn nếu không cleanup; mutation phải dùng tenant/fixture riêng hoặc cleanup rõ.
- **Done khi:** `pnpm test:e2e` hoặc script tương đương trong `kids-crm` chạy PASS.
- **Docs:** cập nhật `kids-crm/README.md` cách chạy.

### BL-011 — Playwright smoke mobile-web

- **Owner:** `kids-mobile-web`
- **Đọc trước:** [FE_TEST_SCENARIOS.md](../kids-mobile-web/FE_TEST_SCENARIOS.md), `kids-mobile-web/src/App.tsx`, `kids-mobile-web/package.json`
- **Làm:**
  - Thêm dependency/script Playwright nếu app chưa có.
  - Tạo smoke PH và GV theo BL-003.
  - Test viewport mobile chính, ví dụ 390x844.
  - Không mock API; dùng seed demo hoặc tenant fixture riêng.
- **Done khi:** script e2e mobile-web chạy PASS trên local.
- **Docs:** cập nhật `kids-mobile-web/README.md`.

### BL-012 — Visual regression CRM/mobile-web

- **Owner:** `kids-crm`, `kids-mobile-web`
- **Đọc trước:** `kids-landing/public/mock-ui`, `kids-crm/src/pages`, `kids-mobile-web/src/pages`
- **Làm:**
  - Dùng Playwright screenshot cho các route chính đã smoke.
  - Lưu screenshot vào thư mục test output và lập bảng PASS/FAIL theo từng route; chưa thêm snapshot baseline tự động trong task này.
  - Kiểm text overflow/overlap ở desktop CRM và mobile viewport.
- **Done khi:** có danh sách màn PASS/FAIL kèm screenshot path; lỗi layout thành task cụ thể theo page.
- **Evidence:** ghi folder screenshot và viewport.

### BL-013 — System/security checklist execution

- **Owner:** `kids-documentation`, `kids-api`, các app liên quan
- **Đọc trước:** [SYSTEM_TEST_CHECKLIST.md](../kids-documentation/SYSTEM_TEST_CHECKLIST.md), [SECURITY_AUDIT_CHECKLIST.md](../kids-documentation/SECURITY_AUDIT_CHECKLIST.md)
- **Làm:**
  - Không thay hai checklist này bằng câu tổng quát. Mỗi dòng TODO trong checklist phải có evidence hoặc task con.
  - Khi chạy xong một dòng, tick trực tiếp trong checklist gốc và ghi evidence ngắn.
  - Nếu dòng phụ thuộc devops/production, ghi blocked input cụ thể thay vì tick.
- **Done khi:** checklist gốc phản ánh trạng thái thật; các TODO còn lại đều có lý do hoặc task owner trong `BACKLOG.md`.

## 3. Mobile native release readiness

### BL-014 — Smoke mobile-native trên thiết bị/simulator

- **Owner:** `kids-mobile-native`
- **Đọc trước:** `kids-mobile-native/README.md`, `kids-mobile-native/app.config.ts`, `kids-mobile-native/src/api/http.ts`, `kids-mobile-native/src/screens/**`
- **Làm:**
  - Chạy API local bằng LAN IP.
  - Set `EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api`.
  - Chạy `cd kids-mobile-native && pnpm start`.
  - Test PH: login -> children -> invoice -> VietQR -> report feed -> logout.
  - Test GV: login -> class roster -> attendance mark -> report compose -> notifications -> logout.
- **Done khi:** smoke PASS trên ít nhất 1 iOS simulator hoặc Android emulator hoặc thiết bị thật.
- **Evidence:** ghi platform/device, API URL dạng masked LAN, màn PASS/FAIL.

### BL-015 — Smoke upload ảnh native

- **Owner:** `kids-mobile-native`, `kids-api`
- **Đọc trước:** `kids-mobile-native/src/api/media.ts`, `kids-mobile-native/src/lib/pickImage.ts`, `kids-mobile-native/src/screens/teacher/ReportComposeScreen.tsx`, `kids-api/src/media/media.controller.ts`, `kids-api/src/media/media.service.ts`
- **Làm:**
  - Trên native, chọn ảnh từ thư viện/camera.
  - Upload `/media` kind `REPORT_PHOTO`.
  - Submit daily report có `photoIds`.
  - Mở report feed PH để xác nhận ảnh render qua auth media.
- **Done khi:** media record tạo đúng tenant, ảnh webp serve được, quota storage cập nhật hoặc không lỗi.
- **Evidence:** ghi media id/report id test.

### BL-016 — EAS/dev build native

- **Owner:** `kids-mobile-native`
- **Đọc trước:** `kids-mobile-native/eas.json`, `kids-mobile-native/app.config.ts`, `kids-mobile-native/package.json`
- **Blocked input:** Expo account/projectId, Apple/Google signing nếu build iOS/Android thật.
- **Làm:**
  - Điền projectId thật vào config nếu đã có.
  - Chạy `eas build --profile preview` hoặc profile được chọn.
  - Không commit secret/signing material.
- **Done khi:** build URL/artifact thành công cho target được chọn.
- **Evidence:** ghi EAS build id/link.

### BL-017 — Deep link và tenant context native

- **Owner:** `kids-mobile-native`
- **Đọc trước:** `kids-mobile-native/app.config.ts`, `kids-mobile-native/app/**`, `kids-mobile-native/src/lib/routes.ts`, `kids-mobile-native/src/api/http.ts`
- **Làm:**
  - Test mở app từ cold start sau login.
  - Test refresh/navigation sâu vào màn PH/GV hiện có.
  - Test logout xoá token + tenant; login tenant khác không dùng lại tenant cũ.
- **Done khi:** tenant context luôn lấy từ SecureStore/MMKV hiện tại, không trộn tenant sau logout/login.
- **Evidence:** ghi case PASS.

## 4. Vận hành SaaS gần production

### BL-018 — Email service nền tảng

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/src/notifications/notifications.service.ts`, `kids-api/src/billing/billing-jobs.service.ts`, `kids-api/src/tenant/tenant.service.ts`, `kids-api/src/config/config.schema.ts`
- **Blocked input:** provider được chọn và credentials dev/prod: SMTP hoặc Resend hoặc SES.
- **Làm:**
  - Thêm config env cho provider đã chọn, fail-fast khi bật email mà thiếu secret.
  - Tạo module service gửi email best-effort có logger, không làm vỡ action chính nếu email fail trừ endpoint test riêng.
  - Gắn email vào các sự kiện: reset password self-service sau BL-019, invoice/dunning sau BL-021.
  - Không gửi PII nhạy cảm không cần thiết trong subject/body.
- **Docs:** cập nhật `kids-documentation/ARCHITECTURE.md`, `kids-documentation/API.md` nếu có endpoint test/config.
- **Verify:** unit/e2e hoặc mock provider test cho success/fail.

### BL-019 — Forgot/reset/change password self-service

- **Owner:** `kids-api`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`
- **Đọc trước:** `kids-api/src/auth/*`, `kids-api/src/tenant/tenant.controller.ts`, `kids-crm/src/pages/LoginPage.tsx`, `kids-mobile-web/src/pages/auth/ResetPasswordPage.tsx`, `kids-mobile-native/src/screens/auth/ResetPasswordScreen.tsx`
- **Blocked input:** BL-018 email service hoặc SMS/Zalo provider cụ thể.
- **Làm:**
  - Backend: thêm request reset, verify token/OTP, set password, invalidate sessions qua `tokenVersion`.
  - Token/OTP phải scoped tenant/user, expire rõ, single-use.
  - FE CRM/mobile-web/native: thay màn hướng dẫn liên hệ bằng form thật; giữ fallback copy khi provider tắt.
  - Không cho enumerate account: response request reset phải giống nhau khi account không tồn tại.
- **Docs:** cập nhật `API.md`, `SECURITY_AUDIT_CHECKLIST.md`, business docs nếu quy trình onboarding đổi.
- **Verify:** e2e request reset success, token expired, token reused, wrong tenant, account not found response.

### BL-020 — Lead/contact API landing

- **Owner:** `kids-api`, `kids-landing`, `kids-platform`
- **Đọc trước:** `kids-landing/src/routes/lien-he.tsx`, `kids-api/src/provisioning/provisioning.controller.ts`, `kids-platform/src/App.tsx`, `kids-platform/src/pages/PostsPage.tsx` để reuse CRUD pattern
- **Làm:**
  - Backend: thêm model/table lead/contact với fields từ form hiện có `/lien-he`; include status, source, note, timestamps.
  - Public API: `POST /public/leads` với rate limit/validation.
  - Platform API/UI: list lead, filter status, update status/note.
  - Landing: submit form thật, loading/success/error state.
- **Docs:** cập nhật `DATABASE_ERD.md`, `API.md`, `kids-business-docs/01-BUSINESS-FLOWS.md`.
- **Verify:** e2e public lead submit + platform list/update; landing build.

### BL-021 — Email dunning cho platform invoices

- **Owner:** `kids-api`, `kids-platform`
- **Đọc trước:** `kids-api/src/billing/billing-jobs.service.ts`, `kids-api/src/platform/platform.service.ts`, `kids-platform/src/pages/WorklistPage.tsx`
- **Blocked input:** BL-018 email service.
- **Làm:**
  - Dùng trạng thái/due date hiện có của `PlatformInvoice`.
  - Gửi email ở mốc T-3/T0/T+3/T+7 cho invoice OPEN/OVERDUE còn nợ.
  - Lưu log gửi hoặc idempotency key để cron không gửi trùng trong cùng mốc.
  - Platform Worklist hiển thị mốc dunning gần nhất hoặc trạng thái gửi nếu API trả được.
- **Docs:** cập nhật `BILLING.md`, `API.md` nếu payload Worklist đổi.
- **Verify:** e2e/cron test không gửi trùng, invoice paid không gửi tiếp.

### BL-022 — Coupon redeem thật trong signup/subscription/invoice

- **Owner:** `kids-api`, `kids-landing`, `kids-platform`
- **Đọc trước:** `kids-api/src/platform/platform.service.ts` coupon methods, `kids-api/src/billing/billing.service.ts`, `kids-api/src/provisioning/provisioning.service.ts`, `kids-landing/src/routes/dang-ky.tsx`
- **Làm:**
  - Backend: accept coupon code in signup paid and subscription billing flow.
  - Validate active/time/max redemption/plan applicability if fields exist; if fields missing, add schema/migration intentionally.
  - Apply discount to invoice lines/total deterministically.
  - Increment `redeemedCount` idempotently only when coupon is actually applied.
  - Landing: input coupon code, preview discount before submit.
  - Platform: show redeemed count from real usage.
- **Docs:** cập nhật `DATABASE_ERD.md`, `BILLING.md`, `API.md`, sales playbook if discount policy visible.
- **Verify:** e2e valid coupon, expired coupon, max redeemed, replay signup/payment does not double count.

### BL-023 — Rotate/revoke public invoice token

- **Owner:** `kids-api`, `kids-platform`
- **Đọc trước:** `kids-api/src/platform/public-invoice.controller.ts`, `kids-api/src/platform/platform.controller.ts`, `kids-api/src/platform/platform.service.ts`, `kids-platform/src/pages/InvoiceDetailPage.tsx`
- **Làm:**
  - Backend: add endpoint to rotate public token for a platform invoice.
  - Backend: audit action `platform.invoice.publicToken.rotate`.
  - Platform UI: action on invoice detail with confirm modal; after rotate, show new public URL.
  - Old token must return 404.
- **Docs:** cập nhật `API.md`, `SECURITY_AUDIT_CHECKLIST.md` if checked.
- **Verify:** e2e old token 404, new token 200, audit log exists.

### BL-024 — Server-side PDF cho hoá đơn/chứng từ

- **Owner:** `kids-api`, `kids-platform`, `kids-crm`
- **Đọc trước:** `kids-api/src/tuition/tuition-print.ts`, `kids-api/src/platform/public-invoice.controller.ts`, `kids-platform/src/components/InvoiceDocument.tsx`, `kids-crm/src/pages/TuitionInvoiceDetailPage.tsx`
- **Blocked input:** engine được chọn: Playwright/Chromium, PDFKit, hoặc service ngoài. Không tự chọn engine PDF nếu deployment chưa xác nhận runtime cho engine đó.
- **Làm sau khi có input:**
  - Backend endpoint trả PDF cho platform invoice và tuition invoice.
  - Giữ HTML print hiện có.
  - FE thêm nút download PDF.
- **Docs:** cập nhật `API.md`.
- **Verify:** PDF render đúng invoice number/amount; auth/public scope đúng.

## 5. File, media, privacy, ops

### BL-025 — R2/S3 media storage adapter

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/src/media/media.service.ts`, `kids-api/src/media/media.controller.ts`, `kids-api/src/config/config.schema.ts`, `kids-documentation/PRIVACY_RETENTION.md`
- **Blocked input:** provider `R2` hoặc `S3`, bucket, region/account, public/private access rule, credentials.
- **Làm:**
  - Tách storage interface: local adapter hiện có + R2/S3 adapter.
  - Giữ sharp re-encode webp và quota logic hiện có.
  - Serve/download vẫn kiểm tenant/permission trước khi trả file hoặc signed URL.
  - Env chọn adapter; dev default local.
- **Docs:** cập nhật `ARCHITECTURE.md`, `API.md`, `PRIVACY_RETENTION.md`.
- **Verify:** e2e upload/download local vẫn pass; thêm test adapter mocked nếu không có bucket thật.

### BL-026 — Cleanup file vật lý khi xóa Media

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/src/media/media.service.ts`, `kids-api/src/albums/albums.service.ts`, `kids-documentation/PRIVACY_RETENTION.md`
- **Làm:**
  - Xác định mọi code path xóa `Media` hoặc entity chứa media.
  - Thêm cleanup best-effort file vật lý sau khi DB state đã an toàn; lỗi cleanup log lại nhưng không phá transaction chính nếu policy chọn async.
  - Nếu dùng R2/S3 sau BL-025, cleanup qua adapter.
  - Thêm script/job quét orphan file local theo `storage/`.
- **Docs:** cập nhật `PRIVACY_RETENTION.md`, `DATABASE_ERD.md` deletion contract nếu đổi cascade.
- **Verify:** test xóa media/album photo -> file không còn hoặc orphan job xử lý.

### BL-027 — Retention/purge jobs

- **Owner:** `kids-api`, `kids-documentation`
- **Đọc trước:** [PRIVACY_RETENTION.md](../kids-documentation/PRIVACY_RETENTION.md), `kids-api/src/billing/billing.cron.ts` để xem pattern cron, Prisma schema
- **Blocked input:** PO/legal xác nhận retention tài chính/audit/child records.
- **Làm:**
  - Implement cron/job theo mốc đã được xác nhận.
  - Có dry-run mode/report trước hard delete.
  - Không hard-delete tenant/student khi còn ràng buộc RESTRICT ngoài policy.
  - Audit job summary.
- **Docs:** cập nhật `PRIVACY_RETENTION.md`, `SECURITY_AUDIT_CHECKLIST.md`.
- **Verify:** e2e hoặc integration test với dữ liệu quá hạn; dry-run không xóa.

### BL-028 — Backup/restore runbook và kiểm chứng

- **Owner:** ops docs, `kids-api`
- **Đọc trước:** [SYSTEM_TEST_CHECKLIST.md](../kids-documentation/SYSTEM_TEST_CHECKLIST.md), [SECURITY_AUDIT_CHECKLIST.md](../kids-documentation/SECURITY_AUDIT_CHECKLIST.md)
- **Blocked input:** môi trường deploy/DB production thực tế.
- **Làm:**
  - Viết runbook backup DB + media.
  - Viết runbook restore vào môi trường test.
  - Chạy restore test và ghi evidence.
  - Định nghĩa RPO/RTO.
- **Docs:** thêm hoặc cập nhật tài liệu ops trong `kids-documentation/` theo đúng nguồn, không tạo trùng nếu đã có file phù hợp.
- **Done khi:** SYSTEM_TEST_CHECKLIST các dòng backup/restore có evidence.

### BL-029 — PostgreSQL RLS trial

- **Owner:** `kids-api`
- **Đọc trước:** `kids-api/src/prisma/prisma-tenant.extension.ts`, `kids-api/prisma/schema.prisma`, [MULTI_TENANCY.md](../kids-documentation/MULTI_TENANCY.md)
- **Làm:**
  - Thiết kế thử nghiệm RLS trên một nhóm bảng domain không phá Prisma tenant extension.
  - Không bật production mặc định trong task đầu.
  - Chạy e2e isolation hiện có để so sánh.
  - Ghi rõ chi phí migration/connection/session variable.
- **Done khi:** có migration/prototype hoặc ADR kết luận rõ; không để trạng thái nửa bật nửa tắt.
- **Docs:** cập nhật `MULTI_TENANCY.md`.

## 6. Push, thanh toán, đối soát

### BL-030 — Push FCM/Expo

- **Owner:** `kids-api`, `kids-mobile-native`, `kids-mobile-web`
- **Đọc trước:** `kids-api/src/notifications/notifications.service.ts`, `kids-api/src/notifications/notifications.controller.ts`, `kids-mobile-native/src/providers/AppProviders.tsx`, `kids-mobile-web/public/sw.js`
- **Blocked input:** chọn Expo push, FCM native, hoặc web push; credentials/project id; privacy copy.
- **Làm:**
  - Backend: model `DeviceToken` scoped user/tenant/device; register/unregister endpoints.
  - Backend: fan-out từ `NotificationsService.notify`, tôn trọng `NotificationPreference`.
  - Native/web: xin permission, register token sau login, unregister khi logout.
  - Không đưa PII nhạy cảm vào push title/body; dùng generic title + mở app xem chi tiết.
- **Docs:** cập nhật `DATABASE_ERD.md`, `API.md`, `PRIVACY_RETENTION.md`, `SECURITY_AUDIT_CHECKLIST.md`.
- **Verify:** e2e API register/unregister; manual push test trên thiết bị.

### BL-031 — VNPay production hardening

- **Owner:** `kids-api`, `kids-crm`, `kids-mobile-web`
- **Đọc trước:** `kids-api/src/billing/payment.service.ts`, `kids-api/src/billing/webhook.controller.ts`, `kids-api/src/tuition/tuition-payment.service.ts`, `kids-api/src/tuition/tuition-webhook.controller.ts`
- **Blocked input:** VNPay production TMN code, hash secret, pay URL, return URL, IPN URL, merchant contract.
- **Làm:**
  - Tách sandbox/prod config rõ trong env.
  - Chạy signature/IPN/replay tests với bộ dữ liệu production-like.
  - FE copy không gọi là production khi env còn sandbox.
- **Docs:** cập nhật `BILLING.md`, `API.md`, business sales copy nếu bật thật.
- **Verify:** e2e signature fail/pass, replay idempotent, amount mismatch blocked.

### BL-032 — Auto đối soát VietQR

- **Owner:** `kids-api`, `kids-platform`, `kids-crm`
- **Blocked input:** provider cụ thể: Casso, SePay, webhook ngân hàng, hoặc bank statement import; payload mẫu và secret/signature scheme.
- **Đọc trước:** `kids-api/src/billing/billing.service.ts`, `kids-api/src/tuition/tuition-payment.service.ts`, `kids-platform/src/pages/WorklistPage.tsx`, `kids-crm/src/pages/TuitionPage.tsx`
- **Làm sau khi có provider:**
  - Backend webhook/import endpoint verify signature.
  - Match transaction bằng invoice number/addInfo + amount + tenant/school.
  - Idempotency theo transaction id/provider ref.
  - UI hiển thị auto-matched/manual-review cases.
  - Giữ mark-paid thủ công làm fallback.
- **Docs:** cập nhật `BILLING.md`, `API.md`.
- **Verify:** tests exact match, amount mismatch, duplicate webhook, unknown invoice.

### BL-033 — Payment gateways MoMo/ZaloPay

- **Owner:** `kids-api`, `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`
- **Blocked input:** provider được chọn trước, merchant credentials, docs version, return/IPN flow.
- **Làm:** không implement placeholder khi chưa có provider. Khi có input, tạo task con theo provider trong file này.
- **Done khi:** task con provider-specific được viết với endpoint, signature, e2e, FE entrypoint rõ.

### BL-034 — Hóa đơn VAT điện tử

- **Owner:** `kids-api`, `kids-platform`, `kids-crm`
- **Blocked input:** nhà cung cấp VAT điện tử VNPT/Viettel/MISA hoặc quy trình kế toán cụ thể; mẫu hóa đơn; mã số thuế công ty xuất hóa đơn.
- **Làm:** không implement cho tới khi có provider/quy trình. Khi có input, tạo task con provider-specific trong file này.

## 7. Sản phẩm nâng cao

### BL-035 — Offline queue mobile-web/native

- **Owner:** `kids-mobile-web`, `kids-mobile-native`, `kids-api`
- **Đọc trước:** `kids-mobile-web/src/api/attendance.ts`, `kids-mobile-web/src/api/reports.ts`, `kids-mobile-web/src/api/medicine.ts`, native file tương ứng, API idempotency hiện có
- **Làm:**
  - Chỉ queue các mutation an toàn: attendance mark, daily report draft/submit, medicine action nếu API state machine cho phép.
  - Mỗi queued item có client id/idempotency key.
  - UI hiển thị pending/synced/failed.
  - Replay khi online; conflict trả lỗi rõ và không lặp vô hạn.
  - Native dùng MMKV; web dùng IndexedDB/local storage có cleanup khi logout.
- **Docs:** cập nhật mobile README và security checklist cache/logout.
- **Verify:** offline -> queue -> online replay; logout xoá queue.

### BL-036 — Import học sinh hàng loạt bằng CSV

- **Owner:** `kids-api`, `kids-crm`
- **Đọc trước:** `kids-api/src/students/students.controller.ts`, `kids-api/src/students/students.service.ts`, `kids-crm/src/pages/StudentsPage.tsx`
- **Làm:**
  - Backend endpoint import CSV; không làm XLSX trong task này.
  - CSV columns bắt buộc: `fullName`, `dateOfBirth`, `gender`, `classroomId`; optional: `nickname`, `guardianName`, `guardianPhone`, `guardianEmail`, `relationship`.
  - Validate từng dòng.
  - Dry-run trả lỗi từng dòng, không ghi DB.
  - Commit mode tạo student/guardian/class assignment theo transaction có quota check.
  - CRM UI upload file, preview lỗi, confirm import.
- **Docs:** cập nhật `API.md`, `DATABASE_ERD.md` nếu thêm import job table.
- **Verify:** e2e dry-run, commit, duplicate guardian, quota exceeded rollback.

### BL-037 — Export CSV học sinh và điểm danh

- **Owner:** `kids-api`, `kids-crm`, `kids-platform`
- **Đọc trước:** `kids-api/src/tuition/tuition.controller.ts`, `kids-crm/src/pages/TuitionPage.tsx`, `kids-platform/src/pages/InvoicesPage.tsx`
- **Làm:**
  - Backend `GET /students/export`: filter theo `classroomId`, `status`, `q`; columns: mã học sinh/id, họ tên, ngày sinh, giới tính, lớp, trạng thái, phụ huynh chính, SĐT phụ huynh.
  - Backend `GET /attendance/export`: filter theo `classroomId`, `dateFrom`, `dateTo`; columns: ngày, lớp, học sinh, trạng thái, giờ đến, ghi chú, người ghi.
  - CRM thêm nút export ở `StudentsPage` và `AttendancePage`.
  - Platform không thêm export mới trong task này; chỉ giữ owner platform để không sửa nhầm invoice export hiện có.
- **Docs:** cập nhật `API.md`.
- **Verify:** e2e quyền admin/principal/teacher scope đúng; CSV không lộ tenant khác.

### BL-038 — Analytics nâng cao feature `analytics`

- **Owner:** `kids-api`, `kids-crm`, `kids-platform`
- **Đọc trước:** `kids-api/src/dashboard/dashboard.service.ts`, `kids-api/src/usage/usage.service.ts`, `kids-api/src/common/guards/subscription.guard.ts`, `kids-crm/src/pages/DashboardPage.tsx`
- **Làm:**
  - Backend endpoints feature-gated `analytics`: attendance trends, growth trends, revenue trends.
  - CRM dashboard hiển thị khi tenant có feature; Free/Starter nhận `FEATURE_NOT_AVAILABLE` và UI giải thích theo i18n.
  - Không thêm Mixpanel/GA; dùng dữ liệu DB hiện có.
- **Docs:** cập nhật `API.md`, `BILLING.md`.
- **Verify:** e2e Pro allowed, Free blocked.

### BL-039 — Admissions pipeline

- **Owner:** `kids-api`, `kids-crm`, `kids-landing`
- **Đọc trước:** lead task BL-020, `kids-api/src/students/*`, `kids-crm/src/pages/StudentsPage.tsx`
- **Blocked input:** PO chốt các trạng thái pipeline và form tuyển sinh tối thiểu.
- **Làm sau khi có input:**
  - Model lead/admission status, assigned staff, notes, next follow-up.
  - CRM pipeline board/list.
  - Convert admission -> student/guardian.
  - Landing lead chỉ đẩy vào admissions khi form `/lien-he` đã có đủ field theo PO chốt trong task này.
- **Docs:** cập nhật business flows, API, ERD.

### BL-040 — Lịch cho uống thuốc chi tiết cho y tá

- **Owner:** `kids-api`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`
- **Đọc trước:** `kids-api/src/medicine/*`, `kids-crm/src/pages/HealthPage.tsx`, mobile medicine screens
- **Làm:**
  - Backend: thêm schedule occurrence/log nếu model hiện tại `MedicineRequest` chưa đủ nhiều lần/ngày.
  - Nurse CRM: danh sách hôm nay theo giờ, action log từng lần.
  - Mobile-web/native: hiển thị trạng thái log read-only cho PH/GV trên màn medicine detail.
  - Giữ state machine hiện có: reject/approve/administered không được phá dữ liệu cũ.
- **Docs:** cập nhật `DATABASE_ERD.md`, `API.md`, business roles.
- **Verify:** e2e nhiều liều/ngày, miss dose, duplicate log blocked.

### BL-041 — Biên nhận và lịch sử thanh toán cho phụ huynh

- **Owner:** `kids-api`, `kids-mobile-web`, `kids-mobile-native`, `kids-crm`
- **Đọc trước:** `kids-api/src/tuition/*`, `kids-mobile-web/src/pages/parent/InvoicesPage.tsx`, `kids-mobile-web/src/pages/parent/PaymentCheckoutPage.tsx`, native invoice screens
- **Làm:**
  - Backend: expose payment receipt detail for parent-scoped invoice/payment.
  - Mobile-web/native: receipt screen/card after paid/partial paid.
  - CRM finance: ensure manual payment note/reference visible in receipt.
- **Docs:** cập nhật `API.md`.
- **Verify:** parent can read own receipt; cannot read other tenant/student receipt.

### BL-042 — AI gợi ý báo cáo và điểm danh AI

- **Owner:** `kids-api`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`
- **Blocked input:** chính sách consent ảnh/trẻ em, provider AI, data retention, opt-in school/parent, cost limit, legal approval.
- **Làm:** không implement code trong task tổng này. Khi có input, tách thành 2 task con: `AI report suggestion` và `AI attendance`, mỗi task phải có security/privacy review trước khi code.
