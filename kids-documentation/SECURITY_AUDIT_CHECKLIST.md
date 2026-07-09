# Security Audit Checklist — KimThanh Kids

Checklist này dùng để lập kế hoạch và theo dõi kiểm tra bảo mật cho toàn hệ thống KimThanh Kids: code, database/schema, API, backend và frontend.

Tài liệu nền cần đọc trước khi audit:

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MULTI_TENANCY.md](./MULTI_TENANCY.md)
- [DATABASE_ERD.md](./DATABASE_ERD.md)
- [API.md](./API.md)
- [BILLING.md](./BILLING.md)

## Cách dùng

- Mỗi dòng checklist nên có người phụ trách, bằng chứng và trạng thái.
- Ưu tiên kiểm tra rò rỉ dữ liệu đa-tenant, phân quyền sai, public API lộ dữ liệu, xử lý file upload và token/session.
- Với lỗi mức High/Critical: tạo issue riêng, ghi rõ endpoint/module, cách tái hiện, dữ liệu bị ảnh hưởng và test phòng hồi quy cần thêm.
- Khi giao cho AI agent: yêu cầu agent đọc file này trước, audit theo thứ tự ưu tiên, ghi findings có bằng chứng, rồi mới sửa code kèm test.

| Trạng thái | Ý nghĩa                  |
| ---------- | ------------------------ |
| `TODO`     | Chưa kiểm tra            |
| `DOING`    | Đang kiểm tra            |
| `PASS`     | Đạt, có bằng chứng       |
| `FAIL`     | Có lỗi, cần issue/fix    |
| `N/A`      | Không áp dụng, ghi lý do |

## Workflow Cho AI Agent

Mục tiêu: dùng checklist này để tìm lỗi có khả năng bị khai thác, sau đó điều chỉnh code để tăng khả năng chống tấn công cho hệ thống multi-tenant.

1. Đọc tài liệu nền theo thứ tự: [ARCHITECTURE.md](./ARCHITECTURE.md), [MULTI_TENANCY.md](./MULTI_TENANCY.md), [DATABASE_ERD.md](./DATABASE_ERD.md), [API.md](./API.md), [BILLING.md](./BILLING.md).
2. Lập inventory endpoint/controller/service/schema liên quan trước khi sửa.
3. Audit theo thứ tự ưu tiên: multi-tenancy/IDOR, RBAC, auth/session, public API, database/schema, upload/media, webhook/billing, frontend token/XSS/cache.
4. Với mỗi nghi vấn, tái hiện bằng test, request mẫu hoặc code reference. Không kết luận chỉ dựa vào tên hàm.
5. Nếu phát hiện lỗi, sửa hẹp đúng module, thêm test hồi quy tương ứng, cập nhật tài liệu nếu hành vi API/schema/permission thay đổi.
6. Trước khi báo xong, chạy lệnh nền theo mục [13. Test Matrix Bắt Buộc](#13-test-matrix-bat-buoc).
7. Không tự commit. Chỉ đề xuất commit message sau khi kiểm tra xong.

Output mong đợi sau mỗi vòng audit:

- Danh sách findings theo severity, có file/line hoặc endpoint cụ thể.
- Checklist các mục đã kiểm tra và bằng chứng.
- Patch code/test/docs nếu có lỗi.
- Kết quả `tsc --noEmit`, `lint`, `test:e2e`.
- Rủi ro còn lại và việc nên audit tiếp.

Ưu tiên xử lý:

| Priority | Nhóm lỗi                                                            | Vì sao ưu tiên                                     |
| -------- | ------------------------------------------------------------------- | -------------------------------------------------- |
| P0       | Cross-tenant data leak, IDOR, bypass RBAC, token/session compromise | Có thể lộ dữ liệu trẻ/phụ huynh hoặc chiếm quyền   |
| P1       | Public API data leak, upload/media abuse, webhook/payment tampering | Có bề mặt tấn công từ internet hoặc ảnh hưởng tiền |
| P2       | XSS/token leak/cache leak ở FE, logging PII, weak rate limit        | Có thể leo thang hoặc lộ dữ liệu qua vận hành      |
| P3       | Hardening infra, headers, dependency hygiene, observability         | Giảm rủi ro nền và tăng khả năng phát hiện         |

## 1. Phạm Vi & Chuẩn Bị

| Check | Hạng mục                                                                                                                    | Bằng chứng cần có                  | Trạng thái                                                                                                                                                                             |
| ----- | --------------------------------------------------------------------------------------------------------------------------- | ---------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | Xác nhận commit/branch/release tag được audit                                                                               | commit hash, branch, ngày audit    | PASS — branch `main`, audit 2026-07-04 (4 vòng), chưa commit (working tree)                                                                                                            |
| [x]   | Liệt kê app trong phạm vi: `kids-api`, `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`, `kids-landing` | danh sách app + version/package    | PASS — audit: `kids-api` (BE, sâu), `kids-mobile-web`/`kids-crm`/`kids-platform` (FE §9/§10). `kids-mobile-native` chưa khởi tạo (N/A); `kids-landing` static (ngoài phạm vi vòng này) |
| [x]   | Liệt kê môi trường kiểm tra: local/staging/prod-like                                                                        | URL, DB, tenant demo, account test | PASS — local: API `localhost:3000`, FE `localhost:5176`, Postgres docker `kids-api-postgres`; e2e dùng app cô lập + createTenant                                                       |
| [x]   | Chuẩn bị tenant test tối thiểu: tenant A, tenant B, platform admin, school admin, teacher, nurse, finance, parent           | seed data hoặc script tạo dữ liệu  | PASS — `prisma:seed:demo` (tenant demo + 5 platform case + đủ role); e2e `createTenant`/`invitedParent` tạo A/B + role                                                                 |
| [x]   | Xác nhận không dùng dữ liệu thật của trẻ/phụ huynh trong quá trình pentest                                                  | biên bản/screenshot cấu hình test  | PASS — chỉ dùng seed demo (tên/SĐT/email giả); không có dữ liệu thật                                                                                                                   |
| [~]   | Xác nhận chính sách severity và SLA xử lý lỗi                                                                               | bảng Critical/High/Medium/Low      | PARTIAL — bảng severity đã dùng (P0-P3 ở đầu file); SLA chưa formal hóa (đề xuất: Critical fix ngay, High ≤3 ngày, Medium ≤2 tuần)                                                     |

## 2. Threat Model & Tài Sản Cần Bảo Vệ

| Check | Hạng mục                                                                                                                          | Bằng chứng cần có       | Trạng thái                                                                                   |
| ----- | --------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | -------------------------------------------------------------------------------------------- |
| [x]   | Xác định dữ liệu nhạy cảm: trẻ, phụ huynh, nhân sự, sức khỏe, thuốc, học phí, hóa đơn, ảnh, audit log                             | data inventory          | PASS — xem "Data inventory" bên dưới                                                         |
| [x]   | Xác định tác nhân: platform staff, chủ trường, giáo viên, y tế, kế toán, phụ huynh, người chưa đăng nhập                          | actor matrix            | PASS — xem "Actor matrix" bên dưới                                                           |
| [x]   | Xác định trust boundary: public API, tenant API, platform API, webhook, media file, landing assets                                | sơ đồ luồng dữ liệu     | PASS — xem "Trust boundaries" bên dưới                                                       |
| [x]   | Xác định các luồng rủi ro cao: login chọn trường, `x-tenant`, subdomain tenant, public invoice token, upload media, VNPay webhook | danh sách abuse case    | PASS — xem "Abuse cases" bên dưới (đã audit vòng 1-4)                                        |
| [x]   | Lập ma trận dữ liệu nào role nào được đọc/ghi                                                                                     | role/data access matrix | PASS — enforce ở `@Roles` + `schoolWhere`/`recordScopeWhere` (xem `02-ROLES-PERMISSIONS.md`) |

### Data inventory (mức nhạy cảm)

| Nhóm dữ liệu                   | Model chính                                                       | Nhạy cảm                  | Ai xem                                             |
| ------------------------------ | ----------------------------------------------------------------- | ------------------------- | -------------------------------------------------- |
| Trẻ em (PII trẻ vị thành niên) | `Student`, `StudentParent`                                        | **CAO** (trẻ em)          | staff school-scope; PH → chỉ con mình              |
| Sức khỏe/thuốc/dị ứng          | `HealthRecord`, `MedicineRequest`, `Allergy`, `Incident`          | **CAO** (y tế)            | staff school-scope + y tá; PH → con mình           |
| Phụ huynh/nhân sự              | `User`, `Membership`                                              | Trung bình (PII)          | admin tenant; self                                 |
| Học phí/hóa đơn                | `TuitionInvoice`, `TuitionPayment`, `PlatformInvoice`             | Trung bình (tài chính)    | staff/finance; PH → hóa đơn con mình               |
| Ảnh (báo cáo/album)            | `Media`                                                           | Trung bình (hình ảnh trẻ) | ACL theo report/album/school (đã vá IDOR vòng 1-2) |
| Audit/log                      | `AuditLog`, `UsageEvent`                                          | Trung bình                | admin tenant (đã lọc `metadata` vòng phase 2)      |
| Bí mật hệ thống                | JWT secret, `VNPAY_HASH_SECRET`, bank config, refresh `tokenHash` | **CAO**                   | không bao giờ trả client                           |

### Actor matrix

`PLATFORM_SUPER_ADMIN`/`PLATFORM_BILLING` (vận hành nền tảng, xuyên tenant) · `SCHOOL_ADMIN`/`PRINCIPAL` (toàn tenant) · `TEACHER`/`NURSE`/`FINANCE` (school-scope) · `PARENT` (chỉ con mình) · **anonymous** (public API: `/public/tenants`, `/public/branding`, signup, webhook, public invoice).

### Trust boundaries

1. **anonymous → public API**: `/public/*` + webhook + public invoice token (UUIDv4). Rủi ro: leak dữ liệu tenant, forge webhook. Trạng thái: đã vá (webhook signature + fail-closed prod; public payload strip field nhạy cảm).
2. **tenant user → tenant API**: cô lập bằng Prisma extension (tenantId) + `x-tenant`/JWT + TenantGuard. Trạng thái: PASS (isolation e2e).
3. **cross-school trong tenant**: `schoolWhere`/`assertSchoolAccess`. Trạng thái: đã vá media/daily-report cross-school.
4. **tenant → platform API**: RolesGuard chặn tenant user gọi `/platform/*`. Trạng thái: PASS.
5. **file media**: `getReadable` ACL theo tenant+school+owner+report/album. Trạng thái: đã vá IDOR.
6. **FE (browser) → API**: token ở localStorage (rủi ro XSS — xem §9, HIGH còn mở); không CSP (§12 devops).

### Abuse cases (đã kiểm)

Login chọn trường qua `x-tenant` (PASS — TenantGuard chặn lệch token) · brute-force login (đã vá: throttle + lockout) · forge VNPay/tuition webhook (đã vá) · đoán public invoice token (PASS — UUIDv4) · upload media cross-school/IDOR (đã vá) · reuse refresh token bị đánh cắp (đã vá: reuse-detection) · mass-assignment field nhạy cảm (PASS — Zod strip + extension override).

## 3. Secrets, Env & Supply Chain

| Check | Hạng mục                                                                                              | Bằng chứng cần có       | Trạng thái                                                                                                                                                                                                                    |
| ----- | ----------------------------------------------------------------------------------------------------- | ----------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | Không có secret thật trong repo, docs, seed, `.env.example`, log test                                 | kết quả secret scan     | PASS — `.env` gitignored (không commit); `.env.example` chỉ placeholder `dev-*-change-me`; seed dùng mật khẩu demo                                                                                                            |
| [x]   | `JWT_SECRET`, refresh secret, VNPAY secret, database URL, storage key đủ mạnh và tách theo môi trường | env review              | PASS — JWT min 32 (nâng từ 16); VNPAY secret bắt buộc ở prod (vòng 1); tách qua `.env`                                                                                                                                        |
| [x]   | File env production không được bundle vào FE                                                          | kiểm tra build artifact | PASS — FE chỉ dùng `VITE_*` (API target); không có secret BE trong FE env                                                                                                                                                     |
| [~]   | Dependency không có lỗ hổng Critical/High chưa xử lý                                                  | `pnpm audit --prod`     | PARTIAL — vá minor/patch (22→13): multer 2.2.0, qs 6.15.2, uuid 11.1.1, js-yaml 4.2.0. Còn 13 transitive cần major/Nest-11 (tar install-time, lodash@nestjs/config, file-type, @nestjs/core) — theo dõi, nâng khi lên Nest 11 |
| [x]   | Lockfile được commit và build dùng lockfile                                                           | review `pnpm-lock.yaml` | PASS — `pnpm-lock.yaml` tracked                                                                                                                                                                                               |
| [x]   | Script build/test không tải code tùy ý từ internet                                                    | review `package.json`   | PASS — `onlyBuiltDependencies` giới hạn build script (prisma/bcrypt/sharp/nestjs-core)                                                                                                                                        |

## 4. Backend Code — NestJS & Prisma

| Check | Hạng mục                                                                                                                  | Bằng chứng cần có                                      | Trạng thái                                                                                                                                                                                          |
| ----- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | Guard chain đúng thứ tự: throttling, JWT, tenant, subscription, roles                                                     | review `app.module.ts`/guard config                    | PASS — `APP_GUARD` trong `app.module.ts`: `ThrottlerGuard` → `JwtAuthGuard` → `TenantGuard` → `SubscriptionGuard` → `RolesGuard`; auth route có named throttler riêng                           |
| [x]   | Endpoint public chỉ dùng `@Public` khi thật sự cần                                                                        | danh sách endpoint public đối chiếu [API.md](./API.md) | PASS — chỉ `auth/login`, `auth/refresh`, `/public/*`, public posts/assets/invoice và webhook platform/tuition; khớp API.md public/webhook sections                                                 |
| [x]   | Tất cả controller domain có `@Roles` phù hợp, không chỉ dựa vào FE ẩn nút                                                 | controller review                                      | PASS — domain controller đều có `@Roles` ở class hoặc method; e2e RBAC phủ tenant/platform/Finance/Nurse negative cases                                                                             |
| [x]   | Endpoint platform dùng `@PlatformRoles`, không lẫn với role tenant                                                        | controller review                                      | PASS — `platform`, `platform/posts`, `platform/usage` gated bằng `@PlatformRoles`; public invoice/assets tách controller `@Public`; tenant user gọi platform → 403 (`auth-rbac.e2e`)                |
| [x]   | Endpoint có feature gating/quota dùng `@RequireFeature` hoặc service quota đúng nơi                                       | module review + e2e                                    | PASS — `albums` dùng `@RequireFeature("media_gallery")`, `lesson-plans` dùng `@RequireFeature("lesson_plan")`; quota ở students/classrooms/members/storage qua `EntitlementService.consumeQuota` |
| [~]   | Query/body/path params dùng Zod DTO hoặc pipe tương đương                                                                 | DTO/controller review                                  | PARTIAL — body/query hầu hết dùng `ZodValidationPipe` + pagination chung; còn một số path param id/raw query đơn giản chưa ép UUID/enum ở boundary, cần audit tiếp khi đóng §8 sort/filter        |
| [~]   | Không truyền object query raw vào Prisma nếu chưa validate kiểu                                                           | service review                                         | PARTIAL — list domain chính đã Zod/page cap và build `where` từ field allowlist; còn vài query đơn giản như export/status cần validate enum ở controller để đóng hẳn                              |
| [~]   | Không dùng `prisma.system` trong tenant service nếu không filter `tenantId` tường minh                                    | `rg "prisma.system"` + code review                     | PARTIAL — các flow tenant-facing chính filter `tenantId` tường minh; `prisma.system` vẫn là foot-gun cho soft-delete/isolation, cần lint/CI guard như mục còn lại vòng 5                         |
| [x]   | `findUnique/update/delete` theo PK không gây IDOR; phải `findFirst` theo scope trước hoặc filter tenant/school tường minh | service review                                         | PASS — 19 điểm PK-mutation đều `findFirst`+scope trước (audit vòng 2) |
| [ ]   | Nested `create`, `upsert`, `createMany` set `tenantId`/`schoolId` tường minh                                              | service review                                         | TODO                                                                  |
| [x]   | Raw SQL nếu có phải parameterized và có tenant/school filter                                                              | `rg "\\$queryRaw\\|\\$executeRaw"`                     | PASS — `rg "\\$queryRaw\\|\\$executeRaw\\|queryRawUnsafe\\|executeRawUnsafe" kids-api/src kids-api/prisma` không có kết quả                                                                        |
| [x]   | Lỗi trả về không lộ stack trace, SQL, secret, token, đường dẫn nội bộ                                                     | test lỗi validation/500                                | PASS — `AllExceptionsFilter` trả envelope `{code,message,details}`; Prisma `P2002/P2025` không trả `meta`; 500 log stack server-side nhưng client chỉ nhận message chung                          |
| [~]   | Log không ghi password, refresh token, access token, thông tin sức khỏe chi tiết, nội dung ảnh                            | log review                                             | PARTIAL — log app hiện chủ yếu ghi count/id/action, không thấy token/password; vẫn cần prod redaction/masking cho exception stack và PII theo §11                                                    |
| [~]   | `AuditService.log` ghi đủ hành động nhạy cảm: login/admin mutation/billing/tuition/medicine/media                         | audit event sample                                     | PARTIAL — platform billing/settings/impersonate, tuition payment, student delete đã log; cần audit coverage matrix cho login/admin mutation/medicine/media để đóng PASS                            |
| [~]   | `NotificationsService.notify` không làm lộ dữ liệu nhạy cảm trong payload                                                 | payload review                                         | PARTIAL — notify là best-effort và không log payload, nhưng một số title/body còn chứa tên bé/tên thuốc/note; trước khi bật push FCM cần chính sách không đưa PII nhạy cảm ra title/body            |

## 5. Authentication & Session

| Check | Hạng mục                                                                           | Bằng chứng cần có    | Trạng thái                                                                                                        |
| ----- | ---------------------------------------------------------------------------------- | -------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [x]   | Login yêu cầu tenant rõ ràng qua host hoặc `x-tenant`; không đăng nhập nhầm tenant | e2e tenant login     | PASS — `TENANT_REQUIRED` khi thiếu ctx; TenantGuard `TENANT_MISMATCH` (auth-rbac e2e)                             |
| [x]   | JWT chứa claim tối thiểu, không chứa dữ liệu nhạy cảm dư thừa                      | decoded token sample | PASS — payload chỉ `sub/type/tenantId/platformRole`                                                               |
| [x]   | Access token TTL ngắn, refresh token TTL/rotation đúng thiết kế                    | test refresh flow    | PASS — access 15m + `tv` revoke; refresh rotation theo `familyId` + reuse-detection (auth-rbac e2e)               |
| [x]   | Refresh token được hash trong DB, không lưu plaintext                              | DB sample            | PASS — SHA-256 hash, token 48-byte CSPRNG                                                                         |
| [x]   | Logout/revoke refresh token hoạt động và token cũ không refresh được               | e2e negative test    | PASS — auth-rbac e2e                                                                                              |
| [x]   | Password hashing dùng bcrypt với cost phù hợp                                      | code review          | PASS — `BCRYPT_COST` (12), helper `password.ts`, rehash-on-login                                                  |
| [x]   | Không cho enumerate account qua login/forgot password/signup                       | response comparison  | PASS — login trả `INVALID_CREDENTIALS` chung cho mọi nhánh                                                        |
| [x]   | Rate limit login/refresh/public signup đủ chặt để giảm brute force                 | config + test        | PASS — throttler `auth` 5/60s/IP + account-lockout theo tài khoản (10 lần → khóa 15'). Còn mở: limit riêng signup |
| [x]   | Tài khoản inactive/suspended không truy cập được endpoint tenant                   | e2e negative test    | PASS — SubscriptionGuard; suspended vẫn login được để vào trả tiền (chủ ý `@AllowInactive`)                       |
| [x]   | Pin thuật toán JWT (HS256), chống algorithm-confusion                              | code review          | PASS — `verifyAccess algorithms:["HS256"]`                                                                        |

## 6. Multi-Tenancy & Authorization

| Check | Hạng mục                                                                                            | Bằng chứng cần có       | Trạng thái                                                                        |
| ----- | --------------------------------------------------------------------------------------------------- | ----------------------- | --------------------------------------------------------------------------------- |
| [x]   | Tenant resolution đúng thứ tự và không bị spoof qua `Host`/`x-tenant`                               | test host/header matrix | PASS — SILO→Host→x-tenant→JWT; TenantGuard chặn lệch (vòng 2)                     |
| [x]   | JWT tenant không khớp host/header bị chặn                                                           | e2e negative test       | PASS — `TENANT_MISMATCH` (auth-rbac e2e)                                          |
| [x]   | Parent chỉ thấy dữ liệu của con mình                                                                | e2e parent isolation    | PASS — `recordScopeWhere`/`ownedStudentWhere` (tuition/health e2e)                |
| [x]   | Staff chỉ thấy dữ liệu trong school scope được phân quyền                                           | e2e school scope        | PASS — `schoolWhere`/`assertSchoolAccess` (vòng 2)                                |
| [x]   | Finance không truy cập module sức khỏe nếu không có role                                            | e2e RBAC                | PASS — `auth-rbac.e2e`: FINANCE gọi `/api/medicine` và `/api/incidents` → 403; health/medicine/incidents/allergies đã gỡ FINANCE khỏi staff least-privilege |
| [x]   | Nurse không truy cập học phí nếu không có role                                                      | e2e RBAC                | PASS — `auth-rbac.e2e`: NURSE `POST /api/tuition/invoices` → 403; tuition MANAGERS/VIEWERS không chứa NURSE                                          |
| [x]   | Teacher không sửa billing/platform settings                                                         | e2e RBAC                | PASS — `@Roles`/`@PlatformRoles` (vòng 2 verify)                                  |
| [x]   | Platform staff không được đọc dữ liệu tenant nhạy cảm nếu endpoint không có mục đích hỗ trợ rõ ràng | platform API review     | PASS — platform endpoint gated `@PlatformRoles`, dùng cho hỗ trợ/billing (vòng 2) |
| [x]   | Tenant A không đọc/sửa/xóa record Tenant B bằng ID đoán được                                        | IDOR test matrix        | PASS — Prisma tenant-extension + `isolation.e2e`                                  |
| [x]   | Public tenant discovery không trả dữ liệu nhạy cảm như MST, email, gói, bank                        | response sample         | PASS — `searchTenants` không trả MST/email/bank (vòng 2)                          |

## 7. Database & Schema

| Check | Hạng mục                                                                      | Bằng chứng cần có                   | Trạng thái                                                                                                                                                     |
| ----- | ----------------------------------------------------------------------------- | ----------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | Mọi model domain có `tenantId` và `schoolId` khi cần theo quy ước             | review `prisma/schema.prisma`       | PASS — audit vòng 5: mọi model domain có `tenantId`, không sót                                                                                                 |
| [x]   | Model tenant-scoped đã được thêm vào `TENANT_KEY`                             | review `prisma-tenant.extension.ts` | PASS — đối chiếu model-by-model, không model nào lọt khỏi TENANT_KEY                                                                                           |
| [x]   | Unique constraint của dữ liệu tenant không vô tình unique toàn hệ thống       | schema review                       | PASS — unique scoped theo tenant/school (School/User/UsageCounter/TuitionInvoice...)                                                                           |
| [x]   | Index hỗ trợ filter `tenantId`/`schoolId` để tránh full scan dữ liệu nhạy cảm | schema/index review                 | PASS — `@@index([tenantId])`/`schoolId`/`tokenHash`/`publicToken`/`familyId` đầy đủ                                                                            |
| [~]   | Quan hệ cascade/delete không xóa dây chuyền ngoài phạm vi tenant              | relation review + test              | PARTIAL — thiếu `onDelete` ở cạnh Tenant/School/User/Student → hard-delete để orphan (giảm nhẹ vì soft-delete). Cần chốt deletion-contract                     |
| [~]   | Soft delete nếu có được filter nhất quán ở list/detail                        | service review                      | PARTIAL — `prisma.db` auto-filter 8 model; `User`/`PlatformPost` ngoài SOFT_DELETE + mọi `prisma.system` phải filter tay (hiện làm đúng, nhưng không có guard) |
| [ ]   | Migration không drop/rename dữ liệu nhạy cảm mà thiếu plan backup/rollback    | migration review                    | TODO — thuộc devops/ops                                                                                                                                        |
| [x]   | Seed/demo không chứa secret production hoặc dữ liệu trẻ thật                  | seed review                         | PASS — seed dùng dữ liệu giả, secret placeholder                                                                                                               |
| [ ]   | DB user production dùng quyền tối thiểu, không dùng superuser app runtime     | config review                       | TODO — devops (§12)                                                                                                                                            |
| [ ]   | Backup DB mã hóa, có kiểm thử restore, có retention rõ ràng                   | ops evidence                        | TODO — devops (§12)                                                                                                                                            |

## 8. API Security

| Check | Hạng mục                                                                                         | Bằng chứng cần có    | Trạng thái                                                                                                                                                        |
| ----- | ------------------------------------------------------------------------------------------------ | -------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [ ]   | API contract trong [API.md](./API.md) khớp controller thực tế                                    | endpoint diff/review | TODO                                                                                                                                                              |
| [x]   | Swagger `/docs` không public ở production                                                        | config/test          | PASS — `main.ts` chỉ `SwaggerModule.setup` khi `!env.isProd` (vòng 7 verify)                                                                                      |
| [x]   | CORS chỉ cho origin hợp lệ, không wildcard khi gửi credential                                    | config review        | PASS — `config.schema` fail-fast wildcard ở prod (vòng 1)                                                                                                         |
| [x]   | Header bảo mật từ Helmet có hiệu lực                                                             | response headers     | PASS — `main.ts` `app.use(helmet())` global (default headers: CSP mặc định off — xem §12 CSP reverse-proxy)                                                       |
| [x]   | Pagination có `pageSize` cap, tránh dump dữ liệu lớn                                             | API test             | PASS — platform/posts có cap riêng; tenant/domain list dùng `page/pageSize` hoặc alias `limit`, max 100, trả `meta{page,pageSize,total}`; e2e chặn `pageSize=101` |
| [ ]   | Sort/filter/search validate allowlist field                                                      | DTO/service review   | TODO — list domain nhận `status`/`studentId` cast enum; chưa allowlist sort field                                                                                 |
| [x]   | Public invoice token đủ khó đoán, không trả `id`/`publicToken` trong public payload              | response sample      | PASS — UUIDv4, strip `id`/`publicToken`                                                                                                                           |
| [x]   | Webhook VNPay xác minh chữ ký, idempotent, không tin amount/status từ client                     | code + replay test   | PASS — platform + tuition hardened; amount lấy từ DB; timing-safe compare (vòng 3)                                                                                |
| [x]   | Endpoint print/export không bỏ qua authz/scope                                                   | e2e negative test    | PASS — `tuition print`→`get()` dùng `recordScopeWhere`; `exportCsv` `schoolWhere` + `@Roles(...STAFF)` (vòng 7 verify)                                            |
| [x]   | Media download kiểm tra quyền xem file tenant/school/owner                                       | e2e media access     | PASS — `getReadable` ACL + `media.e2e` (vòng 1+2)                                                                                                                 |
| [x]   | Upload giới hạn loại file, kích thước, extension, MIME sniffing và xử lý ảnh an toàn             | upload test          | PASS — max 15MB, MIME `image/*`, re-encode webp qua sharp; kind validate (vòng 2)                                                                                 |
| [x]   | Không có path traversal ở public assets/media routes                                             | fuzz path test       | PASS — media.path server-gen `<tenant>/<uuid>.webp`; blog assets regex-gated                                                                                      |
| [x]   | Không có mass assignment vào field nhạy cảm như `tenantId`, `role`, `status`, `plan`, `price`    | DTO review           | PASS — Zod strip field lạ + extension override `tenantId`; `setEntitlement` raw-body → Zod + pick tường minh (vòng 5)                                             |
| [x]   | Response không trả field nội bộ: password hash, refresh token hash, secret, bank config riêng tư | response sample      | PASS — user/audit/billing/tuition select/omit tường minh; exception filter không trả Prisma `meta` (vòng 5)                                                       |

## 9. Frontend Security

| Check | Hạng mục                                                                           | Bằng chứng cần có              | Trạng thái                                                                                                                                                                         |
| ----- | ---------------------------------------------------------------------------------- | ------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | FE luôn gửi đúng `x-tenant` sau khi người dùng chọn trường ở login                 | network trace                  | PASS — `http.ts` gắn `x-tenant` từ tenantStore; verify login demo qua proxy                                                                                                        |
| [~]   | Token storage được đánh giá rủi ro XSS; không log token ra console                 | code review                    | PARTIAL — 3 FE lưu access+refresh ở `localStorage` (rủi ro nếu có XSS); KHÔNG có XSS sink + KHÔNG log token. Khuyến nghị refresh token → cookie `HttpOnly` (mini-project, xem §14) |
| [x]   | Route guard chỉ để UX, backend vẫn enforce quyền                                   | FE/BE review                   | PASS — BE JwtAuth/Tenant/Subscription/Roles guard đầy đủ (vòng 2)                                                                                                                  |
| [x]   | Không render HTML/Markdown từ API bằng `dangerouslySetInnerHTML` nếu chưa sanitize | `rg "dangerouslySetInnerHTML"` | PASS — 0 kết quả; platform posts render qua JSX (auto-escape)                                                                                                                      |
| [x]   | Link/file URL từ API được validate, không tạo open redirect hoặc script URL        | component review               | PASS — media URL nội bộ; crm bản in `document.write` HTML do BE sinh, BE escape đầy đủ (`tuition-print.ts` esc)                                                                    |
| [x]   | Form không cho sửa field nhạy cảm bị ẩn rồi gửi lên API                            | request payload sample         | PASS — BE Zod strip + extension override (mass-assignment vòng 5)                                                                                                                  |
| [x]   | Upload UI chặn file quá lớn/sai loại trước khi gửi và hiển thị lỗi an toàn         | manual test                    | PASS — BE enforce 15MB + image/\* + re-encode webp; FE hiển thị lỗi qua envelope                                                                                                   |
| [x]   | Error UI dùng `error.code`/message an toàn, không hiển thị stack/raw response      | manual test                    | PASS — envelope `{error.code,message}`; filter không trả stack/`meta` (vòng 5)                                                                                                     |
| [~]   | Build production không chứa source map công khai nếu chưa có quyết định vận hành   | build artifact review          | PARTIAL — Vite mặc định không sinh sourcemap ở build prod; xác nhận khi cấu hình deploy (nhóm D)                                                                                   |
| [x]   | PWA/mobile-web cache không lưu dữ liệu nhạy cảm quá lâu hoặc giữa tài khoản        | service worker/cache review    | PASS — `sw.js` bỏ qua `/api/*` + request có `Authorization` (vòng 1)                                                                                                               |
| [ ]   | Native app không hard-code API secret, payment secret hoặc token demo              | code review                    | TODO                                                                                                                                                                               |

## 10. App-Specific Checks

### `kids-platform`

| Check | Hạng mục                                                                            | Bằng chứng cần có | Trạng thái                                                                                                                           |
| ----- | ----------------------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------------------------------------------------------------------ |
| [x]   | Chỉ platform role hợp lệ vào dashboard/admin tenant/billing/settings                | RBAC e2e          | PASS — `@PlatformRoles` + RolesGuard chặn tenant user (auth-rbac e2e, vòng 2)                                                        |
| [~]   | Không hiển thị hoặc export dữ liệu trẻ/phụ huynh ngoài mục đích support đã xác định | screen/API review | PARTIAL — platform API xuyên tenant nhưng không có endpoint list dữ liệu trẻ; impersonate có audit log. Rà UI export ở §11 (privacy) |
| [x]   | Các thao tác đổi gói, đánh dấu thanh toán, cấu hình bank có audit log               | audit samples     | PASS — `AuditService.log` cho impersonate/markPaid/entitlement/settings                                                              |

### `kids-crm`

| Check | Hạng mục                                                              | Bằng chứng cần có | Trạng thái                                                                |
| ----- | --------------------------------------------------------------------- | ----------------- | ------------------------------------------------------------------------- |
| [x]   | Menu/trang quản trị trường bám role tenant, không gọi API ngoài quyền | route/API trace   | PASS — BE `@Roles` enforce; FE guard chỉ UX (vòng 2)                      |
| [x]   | School scope được giữ khi chuyển cơ sở                                | manual/e2e test   | PASS — `schoolWhere`/`assertSchoolAccess` server-side (vòng 2)            |
| [x]   | Các form nhân sự/học sinh không cho leo quyền qua payload             | request review    | PASS — Zod strip + extension override; role chỉ set trong tenant (vòng 5) |

### `kids-mobile-web` / `kids-mobile-native`

| Check | Hạng mục                                                              | Bằng chứng cần có | Trạng thái                                                                          |
| ----- | --------------------------------------------------------------------- | ----------------- | ----------------------------------------------------------------------------------- |
| [x]   | Parent không xem được dữ liệu học sinh khác qua deep link hoặc sửa ID | e2e/manual test   | PASS — `ownedStudentWhere`/`recordScopeWhere` (IDOR vòng 2, media vòng 2)           |
| [x]   | Teacher/Nurse chỉ xem dữ liệu lớp/cơ sở được phân công                | e2e/manual test   | PASS — `schoolWhere` scope theo allowedSchoolIds (vòng 2)                           |
| [x]   | Cache offline/PWA/native không giữ dữ liệu sau logout                 | manual test       | PASS — `sw.js` bỏ qua `/api/*`+Authorization; logout + 401 clear token/tenant store |
| [~]   | Push notification sau này không chứa PII nhạy cảm trong title/body    | design review     | N/A — push FCM chưa triển khai (phase mobile); ghi nhận để làm khi có               |

### `kids-landing`

| Check | Hạng mục                                                                 | Bằng chứng cần có     | Trạng thái                                                                                                                            |
| ----- | ------------------------------------------------------------------------ | --------------------- | ------------------------------------------------------------------------------------------------------------------------------------- |
| [x]   | Public signup validate MST/slug/email và không spam được tenant creation | API + rate limit test | PASS — provisioning validate MST checksum + unique + slug format; throttle default 120/60s. Còn: CAPTCHA/limit riêng signup (đề xuất) |
| [x]   | Blog/Markdown content được sanitize để tránh XSS                         | content render review | PASS — public posts select field an toàn; render qua JSX (không dangerouslySetInnerHTML)                                              |
| [x]   | Public assets không đọc file ngoài thư mục cho phép                      | path traversal test   | PASS — `public-assets.controller` regex whitelist + access() (vòng 2)                                                                 |

## 11. Privacy, Logging & Compliance

| Check | Hạng mục                                                                         | Bằng chứng cần có   | Trạng thái |
| ----- | -------------------------------------------------------------------------------- | ------------------- | ---------- |
| [ ]   | Dữ liệu trẻ em và sức khỏe được phân loại là sensitive trong checklist vận hành  | data classification | TODO       |
| [ ]   | Log production có mask/redaction cho PII/token/health note/payment reference     | log samples         | TODO       |
| [ ]   | Audit log đủ thông tin truy vết nhưng không chứa secret                          | audit samples       | TODO       |
| [ ]   | Chính sách retention cho ảnh, báo cáo ngày, thuốc, sự cố, học phí được xác định  | retention policy    | TODO       |
| [ ]   | Export CSV/print invoice có kiểm soát quyền và có audit khi cần                  | e2e + audit         | TODO       |
| [ ]   | Backup/restore tuân thủ quyền truy cập tối thiểu                                 | ops evidence        | TODO       |
| [ ]   | Có quy trình xử lý sự cố rò rỉ dữ liệu: phát hiện, cô lập, thông báo, postmortem | incident runbook    | TODO       |

## 12. Infra & Deployment

| Check | Hạng mục                                                                          | Bằng chứng cần có    | Trạng thái |
| ----- | --------------------------------------------------------------------------------- | -------------------- | ---------- |
| [ ]   | Production dùng HTTPS bắt buộc, HSTS nếu domain ổn định                           | headers/config       | TODO       |
| [ ]   | DB không public internet hoặc được firewall/IP allowlist                          | network evidence     | TODO       |
| [ ]   | Container/runtime không chạy bằng quyền root nếu không cần                        | Docker/deploy review | TODO       |
| [ ]   | Healthcheck không lộ secret/env/version nội bộ quá chi tiết                       | endpoint review      | TODO       |
| [ ]   | CI chạy typecheck, lint, e2e và dependency/security scan trước deploy             | CI evidence          | TODO       |
| [ ]   | Có alert cho lỗi auth spike, login brute force, webhook fail, 5xx tăng bất thường | monitoring evidence  | TODO       |
| [ ]   | Có backup trước migration production và rollback plan                             | release checklist    | TODO       |

<a id="13-test-matrix-bat-buoc"></a>

## 13. Test Matrix Bắt Buộc

Chạy các test nền trước khi kết luận audit code không làm vỡ hệ thống:

```bash
cd kids-api
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
pnpm exec tsc --noEmit
pnpm lint
pnpm test:e2e
```

Thêm hoặc chạy lại các test bảo mật sau nếu có thay đổi liên quan:

| Check | Kịch bản                                                 | Kỳ vọng                                  | Trạng thái                                                                                                        |
| ----- | -------------------------------------------------------- | ---------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| [x]   | Token tenant A gọi endpoint tenant B qua `Host` tenant B | 403/401, không trả dữ liệu               | PASS — `isolation.e2e`, TenantGuard `TENANT_MISMATCH`                                                             |
| [x]   | Parent sửa `studentId` sang học sinh không phải con mình | 403/404                                  | PASS — `ownedStudentWhere` (auth-rbac/tuition e2e)                                                                |
| [x]   | Teacher sửa/xóa invoice học phí                          | 403                                      | PASS — `@Roles` tuition, verify vòng 2                                                                            |
| [x]   | Finance truy cập medicine/health record                  | 403                                      | PASS — gỡ FINANCE khỏi STAFF của health/medicine/incidents/allergies (code lệch role-model đã fix); e2e auth-rbac |
| [x]   | Nurse truy cập tuition payment                           | 403                                      | PASS — NURSE không trong tuition MANAGERS/VIEWERS; e2e auth-rbac                                                  |
| [x]   | User inactive gọi endpoint domain                        | 403/401                                  | PASS — reload user `isActive/deletedAt` (jwt-auth guard)                                                          |
| [x]   | Public tenant search bằng MST                            | Có thể tìm, nhưng response không trả MST | PASS — `searchTenants` không trả MST/email/bank                                                                   |
| [x]   | Public invoice token sai/đoán ID tuần tự                 | 404                                      | PASS — `publicToken` UUIDv4 ngẫu nhiên, strip `id`                                                                |
| [x]   | Replay webhook VNPay cùng transaction                    | idempotent, không double-pay             | PASS — dedupe `(provider,eventId)` + idempotent `(provider,gatewayRef)` (billing/tuition e2e)                     |
| [x]   | Upload file `.php`, SVG script, ảnh quá lớn, MIME sai    | bị chặn                                  | PASS — MIME `NOT_IMAGE`; SVG re-encode qua sharp → webp; kind `VALIDATION_FAILED` (media e2e)                     |
| [x]   | Media ID tenant khác                                     | 403/404                                  | PASS — cross-tenant 404 + same-tenant/cross-school ACL (media e2e)                                                |
| [x]   | Query param sai kiểu ở list/detail                       | 400 validation, không 500                | PASS — `ZodValidationPipe` (media `kind` e2e vòng 2)                                                              |
| [ ]   | Payload có `tenantId`/`role`/`status` tự gắn             | bị bỏ qua hoặc 400                       | TODO — chưa audit riêng vòng này                                                                                  |

## 14. Báo Cáo Kết Quả Audit

Mỗi phát hiện nên ghi theo mẫu:

```md
### [SEVERITY] Tiêu đề ngắn

- Khu vực: app/module/endpoint/file
- Ảnh hưởng: dữ liệu/role/tenant bị ảnh hưởng
- Cách tái hiện:
- Kết quả thực tế:
- Kết quả mong đợi:
- Nguyên nhân gốc:
- Khuyến nghị sửa:
- Test phòng hồi quy cần thêm:
- Bằng chứng: request/response/log/screenshot
```

Tổng kết findings exploit đã fix (bảng lịch sử vòng 1-4 — các vòng 5-8 ghi chi tiết bên dưới):

| Severity | Số lượng | Đã fix | Còn mở | Ghi chú                                                                                   |
| -------- | -------: | -----: | -----: | ----------------------------------------------------------------------------------------- |
| Critical |        2 |      2 |      0 | Webhook tuition giả mạo; thiếu secret ở prod                                              |
| High     |        2 |      2 |      0 | Media cross-school upload; brute-force login (throttle + account lockout)                 |
| Medium   |        5 |      5 |      0 | JWT alg, trust proxy, refresh reuse-detection, tokenVersion (đều fixed)                   |
| Low      |        5 |      4 |      0 | daily-report scope, media kind, timing-safe, bcrypt cost→12 (fixed); tenant id leak (N/A) |

> Ghi chú phạm vi: **chặn login tenant SUSPENDED** đánh giá **N/A** — tenant quá hạn phải đăng nhập được để vào trả tiền (`@AllowInactive` + SubscriptionGuard). **Bỏ `id` khỏi `/public/tenants`** đánh giá **N/A** — FE dropdown dùng `id` làm `x-tenant`.

---

### Vòng 1 (2026-07-04, Codex) — đã fix, có test hồi quy

Payment/webhook platform + media IDOR + hardening cấu hình (6 vá): non-VNPAY webhook bị từ chối (`payment.service.ts`, `webhook.controller.ts`), `pay` chỉ nhận VNPAY (`billing.controller.ts`), media `getReadable` kiểm quyền nội dung chống IDOR same-tenant (`media.service.ts`), fail-fast CORS wildcard ở prod (`config.schema.ts`), service worker bỏ qua `/api/*` + `Authorization` (`kids-mobile-web/public/sw.js`).

### Vòng 2 (2026-07-04) — audit sâu payment/auth/upload

**ĐÃ FIX (kèm e2e):**

#### [CRITICAL] Webhook học phí (tuition) giả mạo được → đánh dấu đã trả mà không trả tiền

- Khu vực: `src/tuition/tuition-webhook.controller.ts`, `src/tuition/tuition-payment.service.ts:181-191`
- Ảnh hưởng: PH có thể tự đánh hóa đơn học phí của con mình là đã thanh toán (trên mọi môi trường non-prod, vì secret rỗng mặc định → verify bypass). Đây là bản sinh đôi của webhook platform (vòng 1 đã vá) nhưng bị bỏ sót bên tuition.
- Tái hiện: `createGatewayPayment` lấy `gatewayRef` → `POST /api/tuition/webhooks/vnpay {gatewayRef, success:true}` không cần chữ ký hợp lệ → invoice SUCCEEDED. Ngoài ra `POST /api/tuition/webhooks/momo` không bị chặn provider lạ.
- Fix: chặn provider ≠ VNPAY ở route (`UNSUPPORTED_PROVIDER`); phối hợp với require secret ở prod (bên dưới).
- Test: `test/tuition.e2e-spec.ts` — "provider chưa hỗ trợ bị chặn ở webhook tuition".

#### [CRITICAL] `VNPAY_HASH_SECRET` rỗng mặc định → prod có thể nhận webhook giả nếu quên cấu hình

- Khu vực: `src/config/config.schema.ts`; `.env`/`.env.example` để trống.
- Fix: `superRefine` fail-fast — `NODE_ENV=production` + `VNPAY_HASH_SECRET` rỗng → app không khởi động. Non-prod vẫn cho bypass (tiện dev/test) — rủi ro còn lại: staging internet-facing nên set secret.
- Test: verify chữ ký prod đã fail-closed sẵn (`payment.service.ts`, `tuition-payment.service.ts`).

#### [HIGH] Media upload cross-school + [MEDIUM] `kind` không validate → 500

- Khu vực: `src/media/media.controller.ts`, `src/media/media.service.ts:37-84`
- Ảnh hưởng: staff scoped school A upload media gắn `schoolId=B` (cùng tenant); query `kind` sai kiểu tràn xuống Prisma → 500.
- Fix: Zod validate query (`kind`∈MediaKind, `schoolId` uuid → `VALIDATION_FAILED`); `assertSchoolAccess` + kiểm school tồn tại khi có `schoolId` (`SCHOOL_FORBIDDEN`).
- Test: `test/media.e2e-spec.ts` — "kind không hợp lệ → 400", "staff giới hạn school → 403".

#### [LOW] Daily-report gắn ảnh cross-school (cùng tenant)

- Khu vực: `src/daily-reports/daily-reports.service.ts:72-84`
- Fix: `findMany` photoIds thêm scope `OR: [schoolWhere(user), uploadedById=user.id]`.

### Vòng 3 (2026-07-04) — nhóm A: hardening auth/rate-limit (không cần migration)

**ĐÃ FIX:**

- **[HIGH] Rate-limit brute-force login** — thêm named throttler `auth` (mặc định 5 lần/60s) riêng cho `/auth/login` + `/auth/refresh` qua `ThrottlerModule.forRootAsync`; route thường vẫn dùng `default` (120/60s). Verify curl: login sai lần 6 → 429; `/public/tenants` không dính. Config: `AUTH_THROTTLE_LIMIT`/`AUTH_THROTTLE_TTL_MS`/`THROTTLE_LIMIT`/`THROTTLE_TTL_MS` (`.env`). Còn mở: account-lockout theo tài khoản (cần migration).
- **[MEDIUM] Pin thuật toán JWT** — `token.service.ts` `signAccess algorithm:"HS256"` + `verifyAccess algorithms:["HS256"]`.
- **[MEDIUM] `trust proxy`** — `main.ts` set theo `TRUST_PROXY` (`.env`, default 1) → `req.ip` đúng sau reverse proxy cho rate-limit/audit.
- **[LOW] Timing-safe so chữ ký webhook** — helper `common/crypto/timing-safe.ts` (`timingSafeEqualHex`) dùng ở billing + tuition.

**CÒN MỞ (đề xuất vòng sau):**

- **[MEDIUM] Refresh token thiếu reuse-detection** — thêm `familyId`, revoke cả họ khi phát hiện dùng lại token đã revoke (migration).
- **[MEDIUM] Không revoke access token khi reset mật khẩu** — thêm `tokenVersion` trên `User` (migration).
- **[HIGH→cần migration] Account-lockout** — `failedLoginCount`/`lockedUntil` trên `User` (bổ sung cho throttle theo IP đã có).
- **[LOW] bcrypt cost 10 (<12)** — gom 1 helper + nâng cost (migration nhẹ: rehash khi đăng nhập).
- **[INFO] Billing webhook ghi `platformWebhookEvent` trước khi verify** — attacker điều khiển `eventId` → cân nhắc ghi sau verify.
- **[N/A] Chặn login tenant SUSPENDED** — bỏ: tenant quá hạn phải login được để trả tiền.
- **[N/A] Bỏ `id` khỏi `/public/tenants`** — bỏ: FE dropdown dùng `id` làm `x-tenant`.

### Vòng 4 (2026-07-04) — nhóm B: auth hardening có migration

Migration `auth_hardening_lockout_tokenversion_refresh_family` thêm `User.tokenVersion/failedLoginCount/lockedUntil` + `RefreshToken.familyId`.

**ĐÃ FIX (kèm e2e trong `auth-rbac.e2e-spec.ts`):**

- **[HIGH] Account lockout** — sai mật khẩu ≥ `AUTH_LOCKOUT_THRESHOLD` (10) → khóa `AUTH_LOCKOUT_MINUTES` (15') → `ACCOUNT_LOCKED`; login đúng reset bộ đếm (`auth.service.login`). Bổ sung cho throttle theo IP (vòng 3).
- **[MEDIUM] Refresh reuse-detection** — rotation theo `familyId`; dùng lại token đã revoke → revoke cả họ (`auth.service.refresh`). E2e: reuse r1 → r2 cùng họ cũng bị vô hiệu.
- **[MEDIUM] tokenVersion revoke access token** — claim `tv` trong JWT; reset mật khẩu bump `User.tokenVersion` → access token cũ `INVALID_TOKEN` ngay (`token.service` + `jwt-auth.guard` + `tenant.service.resetMemberPassword`). E2e xác nhận.
- **[LOW] bcrypt cost → 12** — helper `common/crypto/password.ts` (`BCRYPT_COST` env, rehash-on-login); thay mọi `bcrypt.hash(_,10)` (tenant/provisioning/seed).

**CÒN MỞ:**

- **[INFO] Billing webhook ghi `platformWebhookEvent` trước khi verify** — attacker điều khiển `eventId` → cân nhắc ghi sau verify.

### Vòng 5 (2026-07-04) — deps + mass-assignment/leak + frontend + privacy + database

> Lưu ý môi trường: vòng này bị gián đoạn — kênh chạy lệnh (npx/pnpm) của phiên lỗi `Stream closed`, nên **các sửa code CHƯA verify được tsc/eslint/e2e**. Cần chạy lại 3 lệnh verify khi phiên hồi (xem cuối mục).

**Phase 1 — §3 Dependencies — ĐÃ FIX + verify (e2e 143):** overrides `multer ^2.2.0`, `qs ^6.15.2`, `uuid ^11.1.1`, `js-yaml@^4 ^4.1.1` (22→13 lỗ). JWT secret min 16→32. 13 lỗ còn lại transitive cần major/Nest-11 (tar install-time, lodash@nestjs/config, file-type, @nestjs/core) — theo dõi.

**Phase 2 — §8 Mass-assignment + Response leak — ĐÃ FIX + verify:**

- 🟡 Tuition invoice detail lộ `rawPayload`/`gatewayRef`/`reference`/`recordedById` cho PH → `select` tường minh (`tuition.service.ts invoiceInclude.payments`).
- ⚪ `/billing/invoices` lộ `publicToken`+`metadata` → `select` (`billing.controller.ts`).
- ⚪ Audit-log tenant lộ `metadata` thô → `select` bỏ metadata (`audit.service.ts`).
- ⚪ `setEntitlement` spread `...override` → Zod schema + pick field (`platform.controller.ts`, `platform.service.ts`).
- Lưu ý kỹ thuật: Prisma 5.22 client CHƯA bật `omit` → dùng `select` (không dùng `omit`).
- Kết luận audit: mass-assignment PASS (Zod strip + extension override tenantId); không leo quyền cross-tenant.
- Test thêm: tuition (payment không lộ field nội bộ), billing (invoices không lộ publicToken/metadata).

**Phase 3 — §9/§10 Frontend — ĐÃ AUDIT + FIX (verify: e2e BE xanh; FE thay đổi trivial):**

- ✅ [LOW] Bỏ prefill credential: `crm/MembersPage` reset password `"Password123"`→`""` (button đã disable khi <8 ký tự); `platform/LoginPage` email super-admin→`""`; `crm/LoginPage` identifier demo→`""`.
- ✅ [LOW] Thêm `.env`/`.env.*` (giữ `!.env.example`) vào `.gitignore` cả 3 FE (trước chỉ có `*.local`).
- ✅ [LOW] Xác nhận `document.write` bản in (crm) AN TOÀN — `tuition-print.ts` `esc()` escape đầy đủ `&<>"` mọi field người dùng (tên HS/PH/org/label/notes).
- 🟠 [HIGH — CÒN MỞ, mini-project riêng] Access + refresh token lưu `localStorage` cả 3 app → XSS đánh cắp token. Rủi ro hiện GIẢM (audit: 0 XSS sink). Fix đề xuất: refresh token → cookie `HttpOnly;Secure;SameSite` + access in-memory (redesign FE+BE+CORS/CSRF+rewrite auth e2e → cần đợt riêng). Nặng nhất `kids-platform`.
- 🟡 [MEDIUM] Không có CSP/X-Frame-Options → thuộc §12 devops (header ở reverse-proxy, `frame-ancestors` phải là header không đặt được qua meta).
- PASS: không `dangerouslySetInnerHTML`/`eval`; không secret trong bundle; SW bỏ `/api/`+`Authorization`; logout + 401 clear token/tenant store; route guard + redirect.

**Phase 4 — §11 Privacy dữ liệu trẻ em — ĐÃ AUDIT:**

- 🔧 [MEDIUM] Media file KHÔNG bao giờ bị xóa khỏi disk (không có `unlink`/delete media) → ảnh trẻ tồn mãi. **Fix code được** — thêm luồng xóa file+row khi gỡ ảnh cuối.
- 🏛️ [HIGH, cần policy/PO] Không có retention/purge; xóa student không xóa health/incident/attendance; không export/erasure cho PH; không wipe dữ liệu khi tenant rời nền tảng; không ghi consent phụ huynh (ảnh/sức khỏe). → **Đây là quyết định sản phẩm/pháp lý (PDPA VN/GDPR-kids), không phải bug.** Cần bàn với PO trước khi code.
- PASS: audit log không lộ PII; log app không ghi tên/sức khỏe; `/public/tenants` minimization.

**Phase 5 — §7 Database — ĐÃ AUDIT (chủ yếu PASS):**

- PASS: **0 raw SQL** (không injection); mọi model domain có `tenantId` + trong `TENANT_KEY` (không sót); unique scoped theo tenant (không enumerate cross-tenant qua P2002); index đủ cho cột bảo mật.
- 🟡 [MEDIUM] Thiếu `onDelete` cascade ở cạnh Tenant/School/User/Student → hard-delete để orphan (giảm nhẹ vì dùng soft-delete). Cần chốt "deletion contract" trước khi làm tính năng xóa/erasure.
- 🟡 [MEDIUM] `prisma.system` bỏ qua cả isolation lẫn soft-delete extension → foot-gun; đề xuất lint/CI guard bắt query thiếu `tenantId`/`deletedAt`.
- ⚪ [LOW] `User`/`PlatformPost` có `deletedAt` nhưng ngoài `SOFT_DELETE` set → cần comment giải thích chủ ý (hiện code luôn filter tay — không rò).

**✅ ĐÃ VERIFY (phiên hồi, `kids-api/`):** `tsc --noEmit` sạch · `eslint src test` sạch · `pnpm test:e2e` **146 test / 16 suite xanh** (dùng `select` thay `omit` vì Prisma 5.22 client chưa bật omit trên extended client).

**Phase 6 (bổ sung vòng 5) — ĐÃ FIX + verify:**

- ✅ [INFO] Billing webhook: verify chữ ký TRƯỚC khi ghi `platformWebhookEvent` → chặn bơm phồng bảng bằng `eventId` tùy ý (`payment.service.ts`).
- ✅ [MEDIUM privacy/RBAC] **FINANCE gỡ khỏi STAFF của health/medicine/incidents/allergies** — kế toán không còn đọc dữ liệu sức khỏe trẻ (code từng lệch role-model đã tài liệu hóa ở `02-ROLES-PERMISSIONS.md`; nay khớp). Quyết định của owner: least-privilege.
- ✅ [LOW] FE: bỏ prefill credential (crm/platform), thêm `.env` vào `.gitignore` 3 FE, xác nhận bản in escape.
- ✅ e2e §13 bổ sung: Finance→medicine/incidents 403, Nurse→tuition 403 (146 test).
- ✅ §2 threat model + §1/§3 chuẩn bị đã điền.

**CÒN LẠI (không thuộc phạm vi code an toàn tự làm):**

- 🟠 FE token→HttpOnly cookie (Phase 3) — redesign FE+BE+CORS/CSRF, mini-project riêng (rủi ro hiện thấp: 0 XSS sink).
- 🔧 code-fix được nhưng phụ thuộc "deletion contract": media file deletion (Phase 4), onDelete cascade (Phase 5).
- 🔧 lint/CI-guard `prisma.system` thiếu `tenantId`/`deletedAt` (Phase 5) — hạ tầng CI.
- 🏛️ Privacy policy (retention/export/erasure/consent/offboarding) — **cần PO quyết định**.
- 🔩 Devops (§12: HTTPS/HSTS/CSP/monitoring/backup) — nhóm D, làm riêng.

### Vòng 7 (2026-07-05) — §8 API hardening + env-completeness

**ĐÃ FIX + verify:**

- ✅ [MEDIUM — config leak/misconfig] **URL cổng VNPay hardcode `sandbox`** ở `billing/payment.service.ts` + `tuition/tuition-payment.service.ts` → đưa vào env `VNPAY_PAY_URL`; `VNPAY_RETURN_URL` cũng không còn fallback code. Khi gọi flow VNPay mà thiếu URL trả `VNPAY_NOT_CONFIGURED`. `config.schema` fail-fast ở prod nếu URL còn chứa `sandbox` → **không thể vô tình đẩy giao dịch thật sang sandbox**.
- ✅ [PRINCIPLE — env nhạy cảm KHÔNG default trong code] Rà `config.schema`: secret bắt buộc không có default (`DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET` → required; `VNPAY_HASH_SECRET`/`VNPAY_TMN_CODE` bỏ `.default("")`; `VNPAY_PAY_URL`/`VNPAY_RETURN_URL` optional khi deploy không dùng VNPay, bắt buộc runtime khi gọi VNPay và bắt đủ qua superRefine nếu production có cấu hình bất kỳ biến VNPay nào). Dev copy giá trị từ `.env.example`. `API_CORS_ORIGINS="*"` giữ default nhưng đã bị superRefine chặn ở prod.
- ✅ [LOW — env drift] `MEDIA_ROOT`/`MEDIA_MAX_DIM`/`MEDIA_QUALITY` có trong `config.schema` nhưng thiếu ở `.env.example` → bổ sung đầy đủ (mọi biến code đọc đều được liệt kê + comment). `.env`/`.env.example` đồng bộ với schema.
- ✅ [verify] Swagger `/docs` chỉ bật khi `!env.isProd` (§8) — đã đúng sẵn, tick.
- ✅ [verify] Print/export tuition scope đúng: `print`→`get()` (`recordScopeWhere`), `exportCsv` (`schoolWhere` + `@Roles STAFF`) — không IDOR (§8), tick.
- ✅ [verify] Helmet global (`app.use(helmet())`) — headers mặc định có hiệu lực (§8), tick.

**CÒN MỞ (đưa lên CÒN LẠI):**

- 🔧 [LOW] Allowlist sort/filter field cho list domain (§8) — chưa làm.

### Vòng 8 (2026-07-09) — §8 pagination cap + VNPay no-runtime-default

**ĐÃ FIX + verify:**

- ✅ [MEDIUM] Domain/tenant list endpoints đã dùng pagination chung `page/pageSize` (alias cũ `limit`) với max 100, trả `meta{page,pageSize,total}`: students/classrooms/tenant schools-members-domains/billing invoices/attendance/daily reports/health/allergies/medicine/leave/incidents/pickup/assignments/tuition/notifications/audit/announcements/menus/lesson-plans/albums.
- ✅ [REGRESSION TEST] `domain.e2e-spec.ts` thêm test list classroom `pageSize=1` có `meta`; `pageSize=101` và `page=10001` trả 400.
- ✅ [MEDIUM] Gỡ nốt fallback `VNPAY_RETURN_URL || "https://sandbox.vnpayment.vn/return"`; platform billing và tuition đều validate trước khi tạo payment, fail runtime bằng `VNPAY_NOT_CONFIGURED` nếu thiếu `VNPAY_PAY_URL` hoặc `VNPAY_RETURN_URL`.
- ✅ [verify 2026-07-09] `kids-api`: `tsc --noEmit`, `pnpm lint`, `pnpm test:e2e` **152 test / 16 suite xanh**. `kids-crm` + `kids-mobile-web`: `pnpm build` xanh.

**CÒN MỞ (đưa lên CÒN LẠI):**

- 🔧 [LOW] Allowlist sort/filter field cho list domain (§8) — chưa làm.

### Vòng 9 (2026-07-09) — sync checklist theo code latest

**ĐÃ CẬP NHẬT DOCS (không đổi code):**

- §4 Backend Code: tick PASS cho guard chain, inventory public endpoint, domain `@Roles`, platform `@PlatformRoles`, feature/quota gating, raw SQL = 0, exception filter không lộ stack/Prisma meta ra client.
- §4 chuyển sang PARTIAL cho các mục chưa nên "xanh hóa" hoàn toàn: Zod/path param coverage, raw query đơn giản, `prisma.system` foot-gun, log redaction prod, audit-log coverage matrix, notification payload PII trước push FCM.
- §6 Multi-Tenancy/RBAC: Finance→medicine/incidents 403 và Nurse→tuition 403 đã sync từ `auth-rbac.e2e`.
- Snapshot checklist sau sync: **127 mục = 91 PASS, 14 PARTIAL, 22 TODO**.

**CÒN MỞ SAU SYNC:**

- Code/audit nhỏ: nested create/upsert/createMany tenantId review, API.md endpoint diff, sort/filter allowlist, payload mass-assignment e2e riêng.
- Mini-project: FE token → cookie `HttpOnly` + access in-memory.
- Product/legal: deletion contract, retention/export/erasure/consent/offboarding.
- Devops: HTTPS/HSTS/CSP, DB firewall, non-root runtime, CI security scan, monitoring/alert, backup/rollback.
