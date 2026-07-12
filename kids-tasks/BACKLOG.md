# KimThanh Kids — Backlog hợp nhất

> Cập nhật: 2026-07-12. File này là backlog thực thi duy nhất sau khi xoá các tracker phase đã DONE.
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

## 0. Ưu tiên cao nhất — Phân tách chức năng theo gói, role & tuân thủ pháp lý

> Nhóm này làm TRƯỚC Nhóm 1. Thứ tự ưu tiên: ~~**BL-049** (gỡ CLASSROOMS khỏi chiều tính gói)~~ **DONE** → ~~**BL-050** (vòng đời & versioning gói)~~ **DONE** → BL-043/044/045 (phân tách feature theo gói cho user từng tenant, Q2) → ~~BL-046~~ **DONE** (hệ thống consent — chờ text luật sư) / BL-047 (TMĐT NĐ 85/2021 — pháp nhân + thông báo BCT) → BL-048 (hoàn thiện role-gating UI kids-crm, Q1).
>
> **Định giá đã chốt (hòa vốn ở 1–2 trường, không lỗ):** Free 0đ (10 HS · 1 GV · **200MB**) · Starter **690k/th** (100 HS · 8 GV · 5GB · +Album) · Pro **1.39tr/th** (300 HS · 25 GV · 20GB · +Album +Giáo án) · Enterprise/Dedicated liên hệ. Gói tính theo **GV + HS + lưu trữ**, KHÔNG theo lớp. Nhỉnh dưới đối thủ + nhiều chức năng; hạ tầng lean ~1–1.3tr/th → 1 trường Pro (hoặc 2 Starter) là hòa vốn. Cơ sở chi phí/thuế: [BILLING.md §Cơ sở định giá](../kids-documentation/BILLING.md).

### 🚀 Lộ trình lên PRODUCTION sớm nhất (mục tiêu 5 trường đầu tiên)

> Sản phẩm đã chạy được (Phase 0 + Phase 1 xong, e2e 181 xanh). Với 5 trường đầu, **việc chặn không phải là thêm tính năng mà là TRIỂN KHAI + hardening tối thiểu + pháp lý tối thiểu**. Làm đúng thứ tự sau; các task khác trong file này để SAU khi đã có khách chạy thật.

**Bắt buộc trước khi mở cho trường thật (P0-PROD):**
1. 🚀 **BL-051** — Provision hạ tầng + deploy production (VPS, Postgres, HTTPS, domain, secrets, backup đêm). *(Bắt đầu ngay — mua VPS.)*
2. 🚀 **BL-005** — CORS origins cho domain thật.
3. ✅ **BL-007** — Rà `.gitignore`/secrets (không lộ `.env`, key) **ĐÃ XONG** (không file nhạy cảm bị track; fix native `!.env.example`).
4. 🚀 **BL-008 + BL-009** — Verify backend (tsc/lint/e2e) + build FE xanh trên máy build.
5. 🧨 **BL-052 → BL-056** — SCHEMA-FREEZE/config-freeze: soft-delete/retention bảng thuế·sức khỏe·trẻ em, chuẩn timezone, invoice-number concurrency, prod-guard JWT secret, chốt topology same-origin FE↔API + `VNPAY_RETURN_URL`. **Làm trước trường thật; áp migration khi DB còn rỗng** (đắt nếu để sau khi có rows).
6. ✅ **BL-046** — Hệ thống consent (đọc + tick ToS/Privacy: chủ trường lúc đăng ký, GV/PH/NV lúc đăng nhập; log bất biến + IP/UA) **ĐÃ XONG**. Chỉ còn **thay bản nháp bằng text luật sư duyệt** trước khi mở trường thật (đổi dữ liệu, không đổi code).
7. 🚀 **BL-001 → BL-004** — Smoke toàn hệ trên chính prod (seed thật, đăng nhập, CRM, mobile, landing) trước khi giao trường.

**Nên làm sớm (ngay sau khi có trường, không chặn launch):**
- ~~**BL-043** (landing hiển thị đúng gói + Coming Soon)~~ **✅ DONE** · **BL-047** (thông tin pháp nhân + thông báo Bộ Công Thương khi bật đăng ký công khai) 🔒 chờ pháp nhân/BCT.

> **🧨 SCHEMA-FREEZE — làm TRƯỚC KHI có dữ liệu trường thật (rẻ lúc DB rỗng, đắt khi phải migrate + backfill sau):**
> - ~~BL-049~~ (gỡ quota lớp) **DONE** · ~~BL-050~~ (versioning + bất biến giá gói — làm trước subscription trả phí đầu tiên) **DONE**.
> - 🆕 **BL-052** — soft-delete + retention cho bảng **tài chính/sức khỏe/trẻ em** (hiện hard-delete + cascade từ Student, KHÔNG có `deletedAt`). *Đắt nhất nếu hoãn.*
> - 🆕 **BL-053** — chuẩn timezone: `@db.Timestamptz(3)` hoặc chốt "UTC trong timestamp trần" tường minh (đổi kiểu cột sau khi có rows = ALTER khoá bảng).
> - 🆕 **BL-054** — invoice-number an toàn concurrency (thay `count()+1` bằng counter/advisory lock — số hóa đơn thuế không được nhảy/trùng).
> - 🆕 **BL-055** — prod-guard chặn JWT secret mặc định dev (min(32) hiện cho secret dev lọt qua khi `NODE_ENV=production`).
> - 🆕 **BL-056** — chốt topology **same-origin FE↔API** trong BL-051 trước khi provision (cookie refresh `SameSite=Lax` host-only sẽ hỏng nếu tách `crm.*` gọi `api.*`) + prod-guard `VNPAY_RETURN_URL`.
>
> *Đã xác minh SOLID, KHÔNG cần churn:* cô lập đa-tenant đầy đủ (mọi bảng domain trong `TENANT_KEY`), bất biến giá/hóa đơn, media key `<tenantId>/<uuid>.webp` sẵn sàng cutover R2 (BL-025) không phải re-key, STORAGE_MB đã enforce.

**Hoãn tới khi >5 trường / có nhu cầu thật:** BL-018 (email — tạm dùng admin reset ở CRM), BL-030 (push), BL-010/011/012 (Playwright/visual), BL-025 (R2/S3 — local + backup là đủ ở quy mô nhỏ), BL-038 (analytics), BL-031/032/033/034 (payment nâng cao), BL-039..042.

### BL-051 — Provision hạ tầng + deploy production (5 trường đầu)

- **Ưu tiên:** P0-PROD (làm đầu tiên — đang mua VPS).
- **Owner:** ops, `kids-api`, các app FE
- **Đọc trước:** `kids-api/.env.example`, `kids-api/docker-compose*.yml` (nếu có), `kids-api/src/config/config.schema.ts`, `DEVELOPMENT.md`
- **Cấu hình VPS khuyến nghị (đủ cho ~5–20 trường nhỏ):**
  - **4 vCPU · 8 GB RAM · 80–100 GB NVMe SSD**, Ubuntu 22.04/24.04 LTS. (Tối thiểu 2 vCPU/4GB nếu tiết kiệm, nhưng 8GB cho Postgres cache + xử lý ảnh sharp thoải mái.)
  - **Đặt máy chủ tại Việt Nam** (latency + tuân thủ dữ liệu trẻ em nên lưu trong nước).
- **Stack triển khai:**
  - Docker + docker-compose: Postgres 16 + `kids-api` (NestJS) + reverse proxy **Caddy** (tự động HTTPS Let's Encrypt) hoặc Nginx + certbot.
  - Build FE (platform/crm/mobile-web/landing) → phục vụ tĩnh (Caddy/Nginx) hoặc host riêng (Vercel/Netlify cho landing/marketing).
  - Domain + subdomain: `admin.*` (platform), CRM, `*.<root>` cho tenant/subdomain, landing.
  - Secrets qua env (KHÔNG commit): `JWT`/token secret mạnh, `DATABASE_URL`, `API_CORS_ORIGINS`, cấu hình VietQR/NH, VNPay (sandbox→prod sau).
- **Backup (bắt buộc):** cron `pg_dump` hằng đêm + tar thư mục media, đẩy off-box (Cloudflare R2 / Backblaze B2). Test restore 1 lần (giao thoa BL-028).
- **Done khi:** hệ thống chạy trên domain thật có HTTPS; đăng nhập/CRM/mobile/landing hoạt động; có backup đêm + đã thử restore.
- **Verify:** smoke BL-001→004 trên prod; `curl` health; kiểm HTTPS + CORS.

## 🧨 Schema-freeze & config-freeze (BL-052→056) — làm TRƯỚC trường thật đầu tiên

> Nhóm này là kết quả rà landmine trước production (2026-07-11, đối chiếu code thật). Nguyên tắc: mọi thứ dưới đây **rẻ khi DB còn rỗng, đắt khi đã có rows** (phải migrate + backfill + sửa nhiều delete path). Cả nhóm thuộc checklist P0-PROD bắt buộc; ưu tiên thực thi **BL-052 > BL-053** (schema), rồi BL-054/055/056 trước khi mở cho trường thật.

### BL-052 — Soft-delete + retention cho bảng tài chính / sức khỏe / trẻ em ✅ DONE

- **Ưu tiên:** CAO NHẤT trong nhóm schema-freeze (đắt nhất nếu hoãn). — **Landmine #1.**
- **Owner:** `kids-api`, `kids-documentation`
- **Vấn đề (đã xác minh):** `Student` là soft-delete, nhưng các bảng con **KHÔNG có `deletedAt`** và gắn `onDelete: Cascade` từ `Student` (`schema.prisma:809,844,1028,1050,1093,...`): `TuitionInvoice`/`TuitionPayment` (chứng từ thuế), `HealthRecord`, `MedicineRequest`, `Incident`, `Attendance`, `PickupLog`, `DailyReport`. Một lệnh `delete` student (hoặc hard-delete) sẽ **cascade xoá sạch** lịch sử thuế + y tế + an toàn của trẻ. Tập `SOFT_DELETE` hiện chỉ 8 model (`prisma-tenant.extension.ts:60-69`).
- **Đọc trước:** `kids-api/prisma/schema.prisma` (các model trên + relation `onDelete`), `kids-api/src/prisma/prisma-tenant.extension.ts` (`SOFT_DELETE`), `kids-api/src/students/students.service.ts` (delete path), `kids-documentation/PRIVACY_RETENTION.md`, `DATABASE_ERD.md` (Deletion contract).
- **Làm:**
  - Thêm `deletedAt DateTime?` cho tối thiểu bảng **thuế + sức khỏe**: `TuitionInvoice`, `TuitionPayment`, `HealthRecord`, `MedicineRequest`, `Incident` (cân nhắc thêm `Attendance`/`DailyReport`/`PickupLog`).
  - Đưa các bảng này vào `SOFT_DELETE`; đổi mọi delete path (đặc biệt xoá Student) sang soft-delete hoặc chặn (RESTRICT) khi còn chứng từ tài chính chưa hết hạn lưu.
  - Quyết định chính sách cascade-vs-restrict + mốc retention (giao thoa BL-027) — ghi rõ vào PRIVACY_RETENTION.
  - Cập nhật e2e isolation/deletion để khẳng định xoá student KHÔNG mất chứng từ thuế/y tế.
- **Docs:** `DATABASE_ERD.md` (Deletion contract + `deletedAt` list), `PRIVACY_RETENTION.md`, `SECURITY_AUDIT_CHECKLIST.md`.
- **Done khi:** không code path nào cascade hard-delete chứng từ thuế/y tế của trẻ; `deletedAt` + retention có tài liệu.
- **Verify:** `cd kids-api && pnpm exec tsc --noEmit && pnpm lint && pnpm test:e2e`.
- **Evidence:** migration `20260711143000_schema_freeze_retention_timezone_invoice_counter` ✅; `deletedAt`/`SOFT_DELETE` + `ON DELETE RESTRICT` cho bảng retention của trẻ; `prisma:deploy` ✅ · `tsc` ✅ · `lint` ✅ · full e2e **181/181** ✅ (`deletion-contract.e2e` khóa hard-delete Student bị RESTRICT + soft-delete giữ chứng từ/y tế).

### BL-053 — Chuẩn timezone cho cột DateTime ✅ DONE

- **Ưu tiên:** CAO (đổi kiểu cột sau khi có rows = `ALTER ... USING` khoá bảng). — **Landmine #2.**
- **Owner:** `kids-api`, `kids-documentation`
- **Vấn đề:** mọi `DateTime` map sang Postgres `timestamp` **without time zone** (Prisma default, không có `@db.Timestamptz`). Chạy đúng khi đọc/ghi qua Prisma (UTC), nhưng công cụ kế toán/BI/raw-SQL đọc trực tiếp sẽ mơ hồ. Cột date-only đã đúng (`@db.Date`).
- **Làm (chọn 1, ghi rõ ADR):**
  - (a) Thêm `@db.Timestamptz(3)` cho các `DateTime` (giữ cửa mở cho BI/kế toán) — migration đổi kiểu khi DB còn rỗng là gần như free; HOẶC
  - (b) Chốt tường minh chuẩn "DB lưu UTC trong timestamp trần" ở `ARCHITECTURE.md` + `DATABASE_ERD.md` để không ai đọc nhầm sau này.
- **Docs:** `ARCHITECTURE.md` (§gotchas/timezone), `DATABASE_ERD.md`.
- **Done khi:** chuẩn timezone được chốt + tài liệu; nếu chọn (a) migration áp trước khi có trường thật.
- **Verify:** `pnpm prisma:deploy` sạch; e2e ngày/giờ (dashboard/attendance) vẫn xanh.
- **Evidence:** đã chọn hướng (a) `@db.Timestamptz(3)` cho mọi `DateTime` có thời điểm thật; `@db.Date` giữ cho date-only. `rg` không còn `DateTime` trần; `prisma:deploy` ✅ · `tsc` ✅ · `lint` ✅ · full e2e **181/181** ✅.

### BL-054 — Invoice-number an toàn concurrency ✅ DONE

- **Ưu tiên:** TRUNG BÌNH (không phải migration, nhưng rẻ khi chưa có hóa đơn thật). — **Landmine #3.**
- **Owner:** `kids-api`
- **Vấn đề:** sinh số hóa đơn bằng `count()+1` (`tuition.service.ts:115-120` `HD-{year}-{n}`; `billing.service.ts:416-425`). Unique constraint chặn trùng nhưng tạo đồng thời → 500 + có thể **nhảy số** (khó chịu về mặt kế toán/thuế).
- **Làm:** serialize theo `(tenant, year)` bằng counter row (`SELECT ... FOR UPDATE`) hoặc advisory lock; retry khi va unique.
- **Docs:** `BILLING.md` (ghi cơ chế đánh số), `API.md` nếu đổi hành vi.
- **Done khi:** tạo hóa đơn đồng thời không 500/không nhảy số.
- **Verify:** e2e/test tạo song song N hóa đơn → số liên tục, không trùng.
- **Evidence:** thêm `InvoiceCounter` `(tenantId, scope)`; học phí + platform invoice cấp số trong cùng transaction; e2e concurrency cho `tuition` + `billing` PASS; `prisma:deploy` ✅ · `tsc` ✅ · `lint` ✅ · full e2e **181/181** ✅.

### BL-055 — Prod-guard chặn JWT secret mặc định/low-entropy ✅ DONE

- **Ưu tiên:** THẤP-nhưng-rẻ (một `superRefine`). — **Landmine #4.**
- **Owner:** `kids-api`
- **Vấn đề:** `config.schema.ts:13-16` chỉ `min(32)`. Default dev trong `.env.example` (`dev-access-secret-change-me-min-32-chars`) ≥32 ký tự → deploy quên đổi secret vẫn **khởi động thành công ở production** với khóa ký công khai.
- **Làm:** thêm `superRefine` chặn đúng chuỗi default dev đã biết (và low-entropy) cho `JWT_ACCESS_SECRET`/`JWT_REFRESH_SECRET` khi `NODE_ENV=production` → fail-fast.
- **Docs:** `SECURITY_AUDIT_CHECKLIST.md`, `.env.example` (ghi rõ phải rotate).
- **Done khi:** prod từ chối boot nếu còn secret mặc định dev.
- **Verify:** unit/config test: prod + default secret → throw; secret mạnh → pass.
- **Evidence:** `config.schema` chặn secret dev/low-entropy khi `NODE_ENV=production`; `test/config-schema.e2e-spec.ts` ✅ · `tsc` ✅ · `lint` ✅ · full e2e **181/181** ✅.

### BL-056 — Chốt topology same-origin FE↔API + prod-guard VNPAY_RETURN_URL ✅ DONE (code/docs; prod smoke trong BL-051)

- **Ưu tiên:** CAO (quyết định deploy, không phải migration — nhưng lộ ra như "bug auth bí ẩn" nếu bỏ sót). — **Landmine #5/#6.**
- **Owner:** ops, `kids-api`
- **Vấn đề:** refresh cookie `SameSite=Lax` + host-only, không set `Domain` (`auth-cookie.ts:7-8,26`), CORS `credentials:true`. Thiết kế giả định **FE gọi API same-origin** (nginx prod). Nếu BL-051 tách `crm.<domain>` gọi `api.<domain>` → cookie refresh cross-site KHÔNG được gửi → web refresh im lặng thất bại. Ngoài ra `VNPAY_RETURN_URL` (default `http://localhost:5173/...`) chưa bị prod-guard như `VNPAY_PAY_URL`.
- **Làm:**
  - Trong BL-051: deploy mỗi web app **same-origin** với API qua reverse-proxy path (`/api` sau cùng host), HOẶC đổi cookie sang `SameSite=None; Secure` + `Domain=.<root>`. Chốt 1 hướng TRƯỚC khi onboard trường.
  - Thêm prod-guard `VNPAY_RETURN_URL` (chặn localhost/http khi production) giống `VNPAY_PAY_URL` (`config.schema.ts:100`).
- **Docs:** `ARCHITECTURE.md` (§auth cookie/topology), `BL-051` runbook, `SECURITY_AUDIT_CHECKLIST.md`.
- **Done khi:** topology auth được chốt + tài liệu; refresh web hoạt động trên domain prod; VNPAY_RETURN_URL prod-guarded.
- **Verify:** smoke login+refresh trên domain prod (BL-001→004); config test VNPAY_RETURN_URL localhost + production → throw.
- **Evidence:** docs chốt same-origin FE↔API qua reverse proxy `/api`; `config.schema` chặn `VNPAY_RETURN_URL` localhost/http/sandbox ở production; `test/config-schema.e2e-spec.ts` ✅ · `tsc` ✅ · `lint` ✅ · full e2e **181/181** ✅. Smoke login/refresh trên domain prod vẫn chạy trong BL-051/BL-001→004 sau deploy.

### Ma trận Entitlement chuẩn (spec cho BL-043/BL-044 — theo code thật `kids-api/prisma/seed.ts`)

> **Nguyên tắc tính gói (chốt 2026-07-10):** gói định lượng theo **số giáo viên (TEACHERS) + số học sinh (STUDENTS) + dung lượng lưu trữ (STORAGE_MB)**. **KHÔNG tính theo số lớp** — số lớp không phải chiều bán gói. Quota `CLASSROOMS` đã được gỡ khỏi enforcement + seed (**BL-049 DONE**); enum giữ lại tránh migration.

Chức năng **nền tảng (luôn bật mọi gói kể cả Free)**: hồ sơ học sinh/PH, lớp, nhân sự; điểm danh + nhật ký ngày; sức khỏe/thuốc/sự cố/dị ứng/nghỉ phép; học phí (hóa đơn·VietQR·tiền mặt/CK thủ công·VNPay sandbox); thông báo + thực đơn tuần; notifications in-app; dashboard/audit/usage; đón-trả (pickup). Các chức năng này KHÔNG gate theo gói.

Chức năng **gate theo feature-flag** và **Coming Soon**:

| Feature | Free | Starter | Pro | Enterprise | Dedicated (ẩn) | Trạng thái code |
| --- | --- | --- | --- | --- | --- | --- |
| `media_gallery` (Album/ảnh) | ✗ | ✓ | ✓ | ✓ | ✓ | **Enforced** (`albums.controller.ts:37`) |
| `lesson_plan` (Giáo án) | ✗ | ✗ | ✓ | ✓ | ✓ | **Enforced** (`lesson-plans.controller.ts:36`) |
| `analytics` (Báo cáo nâng cao) | ✗ | ✗ | ✓ | ✓ | ✓ | **Coming Soon** — cờ khai báo, CHƯA enforce/CHƯA xây |
| `api_access` (API/webhook tích hợp) | ✗ | ✗ | ✗ | ✓ | ✓ | **Coming Soon** — cờ khai báo, CHƯA enforce |
| `messaging` (Chat GV–PH) | ✗ | ✓ | ✓ | ✓ | ✓ | **Coming Soon** — có cờ seed nhưng chưa có module; hiển thị badge "Sắp có" |

Quota theo gói (metric HARD, `null` = không giới hạn):

| Metric (chiều bán gói) | Free | Starter | Pro | Enterprise | Dedicated |
| --- | --- | --- | --- | --- | --- |
| STUDENTS | 10 | 100 | 300 | ∞ | ∞ |
| TEACHERS | 1 | 8 | 25 | ∞ | ∞ |
| STORAGE_MB | 200 | 5120 | 20480 | ∞ | ∞ |
| Giá (VND, NET) | 0 | **690k/th · 6.9tr/năm** | **1.39tr/th · 3.75tr/quý · 13.9tr/năm** | liên hệ | liên hệ (ẩn) |
| ~~CLASSROOMS~~ (đã gỡ — BL-049 DONE) | — | — | — | — | — |

Định giá **nhỉnh dưới đối thủ + gói nhiều chức năng**, đủ **hòa vốn ở 1–2 trường**: Starter 690k @ ≤100 HS +Album ⇒ ~7–14k đ/HS; Pro 1.39tr @ ≤300 HS +Album+Giáo án ⇒ ~4.6–14k đ/HS — ngang/nhỉnh dưới thị trường VN (10–30k đ/HS) nhưng gói nhiều chức năng hơn. Hạ tầng lean ~1–1.3tr/tháng → **1 trường Pro** (hoặc **2 Starter**) là hòa vốn; biên gộp ~90%. Free siết còn **200MB** để user free gần như không tốn chi phí. Cơ sở chi phí/thuế: [BILLING.md §Cơ sở định giá](../kids-documentation/BILLING.md).

Ghi chú enforce (đã xác minh theo code 2026-07-11): STUDENTS/TEACHERS đã consume quota thật; **STORAGE_MB ĐÃ enforce** — mỗi upload cộng dồn `sizeBytes` so với limit (`media.service.ts:76,164-170`), vượt → `QUOTA_EXCEEDED`; `ADMIN_USERS` **đã enforce** (`tenant.service.ts:26`); `SCHOOLS` có seed nhưng không tính vào worklist (gói 1 cơ sở luôn 100%). **CLASSROOMS đã gỡ khỏi enforcement + seed (BL-049 DONE)**; `PUSH_PER_MONTH` còn trong enum nhưng chưa seed/chưa enforce. Coming Soon toàn hệ (không theo gói, chưa build): Push notification, auto đối soát VietQR, MoMo/ZaloPay, VAT điện tử, proration đổi gói giữa kỳ, auto-charge thẻ.

### BL-049 — Bỏ CLASSROOMS khỏi chiều tính gói (quản theo GV + HS + lưu trữ) ✅ DONE

- **Ưu tiên:** CAO NHẤT (sửa sai thiết kế trước khi chốt bảng giá). — **HOÀN THÀNH.**
- **Hướng đã chọn:** GIỮ enum `LimitMetric.CLASSROOMS` (tránh migration), chỉ gỡ enforcement + bỏ khỏi seed + bỏ khỏi mọi bề mặt quota (platform usage/worklist). Enum còn đó nhưng không seed vào gói nào.
- **Đã sửa:** `classrooms.controller.ts` (bỏ `@CheckQuota`), `classrooms.service.ts` (bỏ `consumeQuota/releaseQuota` + dependency EntitlementService), `prisma/seed.ts` (bỏ key CLASSROOMS ở 5 gói), `platform.service.ts` (bỏ CLASSROOMS khỏi `QUOTA_METRICS`, `getTenant.quota`, `usedForTenant`, `usageCounts`), tests `plans.e2e`/`isolation.e2e`/`observability.e2e` (đổi sang khẳng định tạo lớp không bị chặn). Docs: BILLING.md, DATABASE_ERD.md, API.md, 02-ROLES-PERMISSIONS.md, 03-SALES-PLAYBOOK.md.
- **Evidence:** `tsc --noEmit` ✅ · `eslint` ✅ · e2e (xem verify cuối task).
- **Owner:** `kids-api`, `kids-crm`, `kids-documentation`
- **Đọc trước:** `kids-api/prisma/schema.prisma` (enum `LimitMetric`, model `PlanLimit`), `kids-api/src/classrooms/classrooms.controller.ts` + `classrooms.service.ts` (chỗ `@CheckQuota("CLASSROOMS")` + `consumeQuota/releaseQuota`), `kids-api/src/prisma/entitlement.service.ts`, `kids-api/prisma/seed.ts`, `kids-api/test/isolation.e2e-spec.ts` + `plans.e2e-spec.ts` (test đang assert quota CLASSROOMS)
- **Làm:**
  - Gỡ enforce quota `CLASSROOMS`: bỏ `@CheckQuota("CLASSROOMS")` + `consumeQuota/releaseQuota("CLASSROOMS")` ở classrooms service/controller; tạo lớp không còn bị chặn theo gói.
  - Seed: bỏ `CLASSROOMS` khỏi `limits` mọi plan (hoặc set `null`). Giữ enum `LimitMetric.CLASSROOMS` để tránh migration phức tạp, HOẶC gỡ hẳn enum + migration nếu chắc không dùng — chọn 1 hướng, ghi rõ.
  - Cập nhật test: chuyển 2 test quota CLASSROOMS (isolation `:133`, plans `:48`) sang khẳng định "tạo lớp không bị chặn theo gói" (hoặc xoá test quota lớp).
  - CRM/landing: bỏ hiển thị "số lớp" như một giới hạn/điểm bán của gói; chỉ hiển thị GV + HS + lưu trữ.
- **Docs:** `BILLING.md`, `DATABASE_ERD.md` (nếu gỡ enum/metric), `03-SALES-PLAYBOOK.md`, `IMPLEMENTATION_KNOWLEDGE.md`.
- **Done khi:** gói chỉ định lượng theo GV + HS + STORAGE_MB; tạo lớp không bị 403 QUOTA theo gói; e2e xanh.
- **Verify:** `cd kids-api && pnpm exec tsc --noEmit && pnpm lint && pnpm test:e2e`.

### BL-050 — Vòng đời & versioning gói (đổi giá không ảnh hưởng khách cũ; chọn gói đại diện trên landing) ✅ DONE (API/BE)

- **Ưu tiên:** CAO (nền tảng cho việc đổi giá về sau). — **HOÀN THÀNH backend/API** (UI Platform Console quản lý gói = việc FE còn lại, không chặn).
- **Đã làm:** thêm `Plan.isFeatured` (+ migration `20260711120000_plan_featured_versioning`, seed set featured 5 gói). `listPublicPlans` chỉ trả featured (1 gói/tier). `updatePlan` chặn `PLAN_IMMUTABLE` khi gói đã có thuê bao mà đụng prices/features/limits. Thêm `setPlanFeatured` (`PATCH /platform/plans/:id/feature`), `deactivatePlan` (`.../deactivate`), `deletePlan` soft-delete (`DELETE /platform/plans/:id`, chặn `PLAN_HAS_SUBSCRIPTIONS`). `createPeriodInvoice` migrate thuê bao sang gói đại diện mới của tier + tính giá mới (ghi `SubscriptionChange` RENEW `plan_version_migrate`); hóa đơn/kỳ cũ bất biến. `createPlan` mặc định chưa featured.
- **Platform Console:** `PlansPage` quản trị đủ vòng đời — badge "Đại diện", nút Đặt đại diện / Ngừng bán / Xoá; sửa tên/trial/public không gửi `prices` nếu giá không đổi.
- **Fix review Codex (vòng 2):**
  - Chặn mua bản giá cũ: `/public/signup`, signup-upgrade, `/billing/subscription/change` chỉ nhận gói **featured** (sellable) → `INVALID_PLAN` nếu gọi bằng code/id gói cũ.
  - `updatePlan` đổi guard sang **diff-check** (gửi lại đúng giá hiện tại = no-op vẫn OK) → không chặn oan khi sửa tên/trial/public gói đã bán.
  - `isActive=false`/`isPublic=false` (kể cả qua PATCH) **tự clear `isFeatured`**; renewal tìm featured thêm `isPublic` (không migrate sang gói ẩn).
  - Migration: chọn **đúng 1 gói/tier** làm featured (`DISTINCT ON (tier)`) + **partial unique index** `UNIQUE(tier) WHERE isFeatured` (chốt cứng ≤1 featured/tier ở DB).
- **Evidence:** `tsc` ✅ · `eslint` ✅ · e2e **176/176**; build platform/landing/crm/mobile-web ✅. Suite `test/plan-versioning.e2e-spec.ts`: 1 gói/tier featured; versioning + renewal migrate; không mua được bản cũ (`INVALID_PLAN`); deactivate gỡ featured + khỏi landing; không xoá gói còn thuê bao; + observability assert `PLAN_IMMUTABLE`.
- **Owner:** `kids-api`, `kids-platform`, `kids-landing`, `kids-documentation`
- **Đọc trước:** `kids-api/prisma/schema.prisma` (model `Plan` có `isPublic/isActive/deletedAt/sortOrder`, `Subscription.planId`), `kids-api/src/platform/platform.controller.ts` (`listPlans/createPlan/updatePlan` — CHƯA có delete), `kids-api/src/platform/platform.service.ts`, `kids-api/src/billing/billing.service.ts` (renewal đọc `planPrice` hiện tại của plan, `markPaid`/đẩy kỳ `:248,:343`), `kids-api/src/billing/billing.cron.ts`
- **Bối cảnh (yêu cầu CEO):** đổi giá trong tương lai nhưng **không mutate gói cũ** → tạo **phiên bản gói mới (ID mới)**. Khách đã mua theo tháng/quý/năm giữ nguyên giá theo `subscription.planId` cho tới hết kỳ; **kỳ kế tiếp** (tháng/quý/năm sau) tính theo **gói active mới nhất của cùng tier** đang hiển thị trên landing.
- **Làm:**
  - **CRUD gói đầy đủ:** thêm endpoint deactivate (`isActive=false`) + soft-delete (`deletedAt`) + không cho xoá cứng gói còn subscription. UI Platform Console quản lý gói (thêm/sửa/ẩn/active/nghỉ bán).
  - **Versioning:** cho phép nhiều gói cùng `tier` (bỏ ràng buộc "1 code/tier" nếu cần — dùng code có version, ví dụ `pro-2026q3`). Thêm khái niệm **gói đại diện đang bán cho mỗi tier** (cờ `isFeatured`/`isCurrent` hoặc con trỏ per-tier) để landing hiển thị đúng 1 gói/tier.
  - **Landing:** `/public/plans` trả gói đại diện (`isActive && isPublic && isFeatured`) — chọn được gói nào show.
  - **Renewal migration:** khi tạo hóa đơn kỳ mới, nếu tier của subscriber có gói đại diện mới hơn → chuyển `subscription.planId` sang gói mới và tính theo giá mới; hóa đơn đang mở/khách trong kỳ hiện tại KHÔNG đổi.
  - **Bất biến giá đã bán:** không sửa `PlanPrice` của gói đã có subscription; đổi giá = tạo bản ghi/gói mới.
- **Docs:** `BILLING.md` (mục vòng đời/versioning + hành vi renewal), `API.md` (endpoint mới), `DATABASE_ERD.md` (field mới nếu thêm), `IMPLEMENTATION_KNOWLEDGE.md`.
- **Done khi:** đổi giá tạo phiên bản mới; khách cũ giữ giá tới hết kỳ rồi sang gói active mới nhất của tier; admin chọn được gói đại diện show landing; không mutate giá gói đã bán.
- **Verify:** e2e: (a) tạo phiên bản mới không đổi hóa đơn/kỳ hiện tại của khách cũ; (b) renewal tính theo gói đại diện mới; (c) landing chỉ hiện 1 gói/tier theo cờ đại diện.

### BL-043 — Bảng giá landing hiển thị đúng feature theo gói + đánh dấu Coming Soon ✅ DONE

- **Trạng thái 2026-07-12:** hoàn tất. `bang-gia.tsx` tách feature thành 2 nhóm: enforced (`media_gallery`/`lesson_plan` → dấu ✓) vs Coming Soon (`analytics`/`api_access`/`messaging` → icon đồng hồ mờ + badge "Sắp có"), không bán như đã có. Landing không có i18n → chỉ VI. BILLING/business-docs đã sẵn mô tả Coming Soon (không cần sửa thêm).
- **Verify:** `kids-landing pnpm build` ✅ · `pnpm lint` ✅ (tiện fix 1 lỗi prettier có sẵn ở `dang-ky.tsx:318`). Browser (Playwright/Chrome) trên `/bang-gia` với API thật: Starter→messaging "Sắp có"; Pro→messaging+analytics "Sắp có"; Enterprise→+api_access "Sắp có"; Album/Giáo án giữ ✓; 4 card không tràn/đè.
- **⚠️ Ngoài scope phát hiện khi verify (chưa sửa):** card Free (0đ) hiển thị "Liên hệ"/"Nhận tư vấn" do `contactOnly = ... || amount <= 0` (`bang-gia.tsx:~140`) gộp nhầm gói 0đ — nên tách "free" khỏi contactOnly. Chờ quyết định.
- **Owner:** `kids-landing`, `kids-documentation`
- **Đọc trước:** `kids-landing/src/routes/bang-gia.tsx` (đặc biệt `FEATURE_LABELS` :31-37, danh sách feature nền tảng :58-62), `kids-landing/src/api/public.ts`, `kids-documentation/BILLING.md`, ma trận ở trên
- **Làm:**
  - Landing đã đọc động `/public/plans` — giữ nguyên; chỉ sửa lớp hiển thị.
  - Với feature Coming Soon (`analytics`, `api_access`, `messaging`/Chat): hiển thị kèm **badge "Sắp có"**, style phân biệt (mờ/nhãn), KHÔNG bán như đã có, không cho hiểu là dùng được ngay.
  - Feature nền tảng luôn-bật: giữ nhóm hiển thị chung cho mọi gói (đã có :58-62), rà đúng danh sách theo ma trận.
  - Không hardcode giá/quota; giá/quota vẫn từ API.
  - Cập nhật i18n VI/EN cho badge "Sắp có" nếu landing có i18n.
- **Docs:** đồng bộ `kids-documentation/BILLING.md` §feature (Chat = Coming Soon, không còn "đã loại"), `kids-business-docs/` bảng giá sales.
- **Done khi:** trang `/bang-gia` thể hiện đúng feature từng gói theo ma trận; Coming Soon có badge rõ; không cam kết feature chưa có như đã có.
- **Verify:** `cd kids-landing && pnpm build && pnpm lint`; xem `/bang-gia` render đúng từng gói.

### BL-044 — Feature-gating theo gói ở FE (CRM + mobile-web + native) ✅ DONE

- **Trạng thái 2026-07-12:** code/docs đã triển khai + verify đầy đủ (e2e đã chạy lại xanh sau khi Docker lên).
- **Đã làm:** CRM route guard `media_gallery`/`lesson_plan` cho `/albums`/`/lessons`; mobile-web + native route guard Album/Giáo án bằng `/auth/me.features`; shortcut mobile ẩn Album/Giáo án khi gói chưa bật. README app + SECURITY/BILLING/IMPLEMENTATION_KNOWLEDGE đã đồng bộ.
- **Verify:** `kids-crm pnpm build` ✅ · `kids-mobile-web pnpm build` ✅ · `kids-mobile-native pnpm typecheck && pnpm lint` ✅ · `kids-api tsc/lint` ✅ · `kids-api test:e2e` **181/181 (21 suite)** ✅. i18n `featureGate.title/body` (mobile) + `feature.upgradeTitle/Body` (CRM) parity VI/EN ✅.
- **Owner:** `kids-crm`, `kids-mobile-web`, `kids-mobile-native`
- **Đọc trước:** `kids-crm/src/components/AppLayout.tsx` (`canSee`/`feature` :55-146), `kids-crm/src/api/auth.ts` (`Me.features` :15-16), `kids-crm/src/App.tsx` (route :79-99), tương ứng ở mobile-web/native
- **Làm:**
  - Route guard theo feature: khi tenant không bật feature, route liên quan (`/albums`→`media_gallery`, `/lessons`→`lesson_plan`, và analytics khi có) không render page thao tác mà show state "Nâng cấp gói"/`FEATURE_NOT_AVAILABLE` theo i18n, thay vì để API 403.
  - Trong page có nhánh feature: ẩn/disable section/nút theo `me.features[key]`, kèm gợi ý nâng gói.
  - Không tự bịa feature key; chỉ dùng key có thật: `media_gallery`, `lesson_plan` (và `analytics` sau khi BL-045 enforce).
  - Backend `@RequireFeature` vẫn là chốt an toàn; đây là lớp UX.
- **Docs:** cập nhật README app phần feature-gating; `SECURITY_AUDIT_CHECKLIST.md` dòng defense-in-depth FE.
- **Done khi:** user gói không bật feature không thấy page/section/nút tương ứng (không còn "bấm mới 403").
- **Verify:** build từng app; smoke với tenant Free vs Pro (seed demo có case gói khác nhau).

### BL-045 — Enforce hoặc dọn cờ feature "chết" ở API (`analytics`, `api_access`) ✅ DONE

- **Trạng thái 2026-07-12:** code/docs đã triển khai + verify đầy đủ (e2e đã chạy lại xanh).
- **Đã làm:** `prisma/seed.ts` ghi rõ feature key enforced (`media_gallery`, `lesson_plan`) vs Coming Soon (`messaging`, `analytics`, `api_access`); BILLING/SECURITY/IMPLEMENTATION_KNOWLEDGE cập nhật để FE không hiểu nhầm `analytics`/`api_access` đã enforce.
- **Verify:** `kids-api pnpm exec tsc --noEmit` ✅ · `kids-api pnpm lint` ✅ · `kids-api test:e2e` **181/181 (21 suite)** ✅.
- **Owner:** `kids-api`, `kids-documentation`
- **Đọc trước:** `kids-api/src/common/guards/subscription.guard.ts`, `kids-api/src/prisma/entitlement.service.ts`, `kids-api/prisma/seed.ts:15,328-334`, `kids-documentation/BILLING.md:17,55`
- **Làm:**
  - `analytics`: hoặc (a) làm cùng BL-038 (thêm endpoint `@RequireFeature("analytics")`), hoặc (b) nếu chưa làm, giữ cờ nhưng đánh dấu Coming Soon nhất quán ở seed comment + BILLING.md; KHÔNG để FE tưởng đã enforce.
  - `api_access`: chưa có bề mặt API tích hợp → giữ Coming Soon, ghi rõ chưa enforce.
  - `messaging`: giữ cờ cho Chat Coming Soon; ghi rõ chưa có module.
  - Không xoá key khỏi enum nếu đã seed vào `PlanFeature` (tránh migration rủi ro); chỉ chuẩn hoá trạng thái + tài liệu.
- **Docs:** cập nhật `BILLING.md` (bảng feature + trạng thái enforce), `IMPLEMENTATION_KNOWLEDGE.md`.
- **Done khi:** mỗi feature key có trạng thái rõ (Enforced / Coming Soon) khớp giữa seed, BILLING.md và FE.
- **Verify:** `cd kids-api && pnpm exec tsc --noEmit && pnpm lint && pnpm test:e2e`.

### BL-046 — Consent pháp lý (Luật 91/2025 + NĐ 356/2025, hiệu lực 01/01/2026) ✅ HỆ THỐNG DONE (chờ text luật sư)

- **Trạng thái:** hệ thống consent **đã hoàn thành** (BE + landing + CRM + mobile-web). **Còn lại:** thay bản nháp văn bản bằng bản luật sư/PO duyệt (chỉ đổi dữ liệu, không đổi code) + trang privacy/terms công khai riêng ở landing (hiện đọc qua modal/gate) — thuộc BL-047/PRIVACY_RETENTION.
- **Đã làm:**
  - BE: `ConsentDocument` (versioned TERMS/PRIVACY) + `ConsentAcceptance` (log bất biến + IP/UA) + migration + seed bản nháp VN (`prisma/consent-documents.ts`, ⚠️ cần luật sư duyệt). `ConsentModule`: `GET /public/legal`, `GET /consent/pending`, `POST /consent/accept`. `/public/signup` ép `acceptConsent=true` + ghi acceptance chủ trường trong transaction (platform tạo hộ KHÔNG ghi khống). `/auth/me` trả `pendingConsents`.
  - FE: landing `dang-ky` checkbox không-tick-sẵn + modal đọc ToS/Privacy, chặn submit tới khi tick. CRM `ConsentGate` bọc AppLayout; mobile-web gate trong `RoleGuard` → GV/PH/NV phải đọc + tick mới vào app.
  - Đổi nội dung về sau = tăng `version` rồi reseed (user phải đồng ý lại).
- **Evidence:** e2e `test/consent.e2e-spec.ts` (public/legal · signup ghi acceptance · gate pendingConsents · accept) — full **175/175**; build landing/crm/mobile-web ✅.
- **Còn lại (blocked/def):** nội dung pháp lý chính thức (PO/luật sư); DPIA + đầu mối bảo vệ DLCN (PRIVACY_RETENTION); consent người giám hộ ở bước nhập học sinh CRM/mobile (task con nếu cần).

<details><summary>Spec gốc (đã triển khai)</summary>

- **Owner:** `kids-landing`, `kids-api`, `kids-documentation`
- **Đọc trước:** `kids-landing/src/routes/dang-ky.tsx`, `kids-landing/src/routes/lien-he.tsx`, `kids-api/src/provisioning/provisioning.controller.ts`, `kids-documentation/PRIVACY_RETENTION.md`
- **Blocked input:** nội dung pháp lý chính thức do PO/luật sư duyệt (Privacy Policy, Điều khoản dịch vụ, thông tin DPO/bộ phận bảo vệ DLCN).
- **Làm:**
  - Form đăng ký/liên hệ: thêm **checkbox consent riêng, không tick sẵn**, tách bạch với nút submit; nêu rõ mục đích thu thập (tên, email, SĐT, tên trường) trước khi gửi.
  - Thêm trang **Chính sách bảo mật** + **Điều khoản dịch vụ** (route + link footer); nêu quyền: được biết/truy cập/sửa/xóa/rút đồng ý và cách thực hiện.
  - Vì SaaS xử lý **dữ liệu trẻ em (nhạy cảm)**: khi onboarding/nhập học sinh, có **consent người giám hộ** rõ ràng; ghi cơ sở pháp lý xử lý dữ liệu trẻ. (Phần nhập liệu học sinh nằm ở CRM/mobile — mở task con nếu cần.)
  - Không cản đăng ký quá mức: consent gọn 1–2 dòng + link "xem chi tiết", không bắt đọc hết mới cho submit.
  - Cân nhắc mục PRIVACY_RETENTION: DPIA (hồ sơ đánh giá tác động) + chỉ định bộ phận/nhân sự bảo vệ DLCN.
- **Docs:** cập nhật `kids-documentation/PRIVACY_RETENTION.md`, `SECURITY_AUDIT_CHECKLIST.md`.
- **Done khi:** thu thập dữ liệu có consent hợp lệ + có Privacy Policy/ToS công khai; luồng đăng ký vẫn mượt.
- **Verify:** `cd kids-landing && pnpm build`; rà UX submit vẫn thông; checklist privacy tick các dòng tương ứng.

</details>

### BL-047 — Landing tuân thủ TMĐT (NĐ 52/2013 sửa bởi NĐ 85/2021): thông tin pháp nhân + thông báo Bộ Công Thương

- **Owner:** `kids-landing`, ops docs
- **Đọc trước:** `kids-landing/src/routes/bang-gia.tsx`, `kids-landing/src/routes/dang-ky.tsx`, `kids-landing/src/routes/dang-ky.thanh-cong.tsx`, footer/layout landing
- **Blocked input:** thông tin pháp nhân chính thức (tên công ty, MST, địa chỉ, hotline, email), và việc thực hiện **thông báo website tại online.gov.vn** (thủ tục ngoài code).
- **Làm:**
  - Footer/trang thông tin: hiển thị **tên doanh nghiệp, MST, địa chỉ, liên hệ**; sau khi thông báo BCT xong, gắn **logo/dấu "đã thông báo"** trỏ online.gov.vn.
  - Trước bước đăng ký gói trả phí: hiển thị rõ **giá đã gồm/chưa gồm thuế**, **điều khoản dịch vụ**, **phương thức thanh toán**, chính sách hoàn/hủy — trước khi khách xác nhận.
  - Trang xác nhận đăng ký: tóm tắt gói/giá/điều khoản đã đồng ý.
- **Docs:** ghi runbook thủ tục thông báo BCT vào `kids-documentation/` (ops), không tạo file trùng.
- **Done khi:** landing hiển thị đủ thông tin pháp nhân + điều khoản trước khi chốt đăng ký; sẵn sàng gắn dấu BCT sau khi thông báo.
- **Verify:** `cd kids-landing && pnpm build`; rà các trang giá/đăng ký/liên hệ có đủ thông tin bắt buộc.

### BL-048 — Hoàn thiện role-gating UI kids-crm (route guard + ẩn nút hành động theo role) ✅ DONE

- **Trạng thái 2026-07-12:** code/docs đã triển khai + verify đầy đủ.
- **Đã làm:** CRM thêm `RequireRole` cho `/members`, `/settings`, `/audit-logs`, `/health`, `/pickup`, `/lessons`; nút tạo/thu/hủy học phí, reset/tắt thành viên, duyệt/từ chối nghỉ phép, tạo/thu hồi pickup được ẩn theo role khớp backend. README + SECURITY/IMPLEMENTATION_KNOWLEDGE đã đồng bộ.
- **Đối chiếu role khớp backend @Roles (đã xác minh):** ADMIN_ROLES=[SCHOOL_ADMIN,PRINCIPAL] (members/audit/settings) · NON_FINANCE_ROLES=[+TEACHER,+NURSE] (health/pickup STAFF) · LESSON_EDITOR/leave APPROVERS=[+TEACHER] · tuition MANAGERS=[SCHOOL_ADMIN,PRINCIPAL,FINANCE].
- **Verify:** `kids-crm pnpm build` ✅ · `kids-api tsc/lint` ✅ · `kids-api test:e2e` **181/181 (21 suite)** ✅. `kids-crm` không có script `lint` trong `package.json` (build đã typecheck qua `tsc`).
- **Owner:** `kids-crm`
- **Đọc trước:** `kids-crm/src/App.tsx` (`RequireAuth` :32-35, `DashboardGate` :41-50, routes :79-99), `kids-crm/src/components/AppLayout.tsx` (`canSee`/`roles` :55-146), `kids-crm/src/lib/roles.ts`, `kids-crm/src/api/auth.ts`
- **Làm:**
  - Thêm `RequireRole`/guard cho các route đang chỉ ẩn ở nav: `/members`, `/settings`, `/audit-logs` (ADMIN_ROLES), `/health`, `/pickup` (NON_FINANCE_ROLES), `/lessons` (LESSON_EDITOR_ROLES) → user sai role gõ thẳng URL bị redirect/`403 page`, không render page thao tác.
  - Ẩn/disable **nút hành động theo role** trong page (không chỉ chờ API 403): ví dụ tạo hóa đơn (`TuitionPage.tsx:274`, FINANCE/ADMIN), reset mật khẩu (`MembersPage.tsx:363`, ADMIN), approve/reject nghỉ phép (`LeaveRequestsPage.tsx:112-118`, theo role duyệt), create/revoke pickup (`PickupPage.tsx:177,190`).
  - Dùng `me.roles` + helper `isAdminRole`/`hasAnyRole` sẵn có ở `lib/roles.ts`; không tự định nghĩa role mới.
  - Backend `@Roles` vẫn là chốt an toàn; đây là lớp UX giảm bề mặt 403.
- **Docs:** cập nhật `SECURITY_AUDIT_CHECKLIST.md` (§10 CRM defense-in-depth, mở rộng từ nav sang route + nút), `kids-crm/README.md`.
- **Done khi:** user sai role không vào được page hạn chế qua URL và không thấy nút hành động ngoài quyền; đúng khớp `@Roles` backend.
- **Verify:** `cd kids-crm && pnpm build`; smoke đăng nhập từng role (admin/teacher/nurse/finance) theo seed demo.

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

### BL-006 — Error code mapping FE ✅ DONE

- **Trạng thái 2026-07-12:** hoàn tất cả 5 app. Helper `errorMessage(e, t)` (landing: `errorMessage(e, fallback)` vì không i18n) map `error.code` → copy ổn định; code lạ → message backend (đã localize theo `x-language`); non-ApiError/không rõ → `errors.generic` (không lộ raw/stack). Namespace i18n `errors` (generic + 11 code) thêm ở VI **và** EN, parity 12 key mỗi app.
- **Đã áp:** CRM 42 site + LoginPage · Platform 12 site + LoginPage (thêm `useT` cho PostsPage) · mobile-native 8 site + LoginScreen (thêm `useT` cho AnnouncementCompose) · mobile-web LoginPage · landing dang-ky. Login map đúng `INVALID_CREDENTIALS`/`ACCOUNT_LOCKED`/`TENANT_REQUIRED` (trước chỉ hiện "sai đăng nhập" chung); lỗi mạng vẫn giữ `errNetwork`.
- **Verify:** build CRM/platform/mobile-web/landing ✅ · native `tsc`+`lint` ✅ · landing `lint` ✅ · i18n parity VI/EN 12 key ✅ · không còn site raw `? x.message :` (trừ `http.ts` tạo ApiError) ✅.
- **Owner:** `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`, `kids-landing`
- **Đọc trước:** `kids-api/src/common/filters/all-exceptions.filter.ts`, `kids-api/src/common/guards/subscription.guard.ts`, `kids-api/src/tuition/tuition-payment.service.ts`, từng app `src/api/http.ts`, từng app `src/i18n/{vi,en}.json`
- **Làm:**
  - Lập danh sách code tối thiểu phải map: `QUOTA_EXCEEDED`, `FEATURE_NOT_AVAILABLE`, `NO_BANK_CONFIG`, `NOT_FOUND`, `FORBIDDEN`, `VALIDATION_FAILED`, `INVALID_CREDENTIALS`, `TENANT_REQUIRED`, `ACCOUNT_LOCKED`, `SLUG_UNAVAILABLE`, `NO_PUBLIC_PRICE`.
  - Thêm helper map lỗi trong từng app nếu chưa có.
  - Thay các nơi show raw `error.message` không ổn định bằng message từ i18n theo `error.code`; vẫn fallback sang `error.message` khi code chưa biết.
  - Cập nhật cả VI và EN.
- **Done khi:** các app hiển thị lỗi nghiệp vụ bằng copy ổn định; không lộ stack/raw object.
- **Verify:** build từng app đã sửa; kiểm i18n parity nếu app có script/parity helper.

### BL-007 — Kiểm tra `.gitignore` và file generated/build ✅ DONE

- **Trạng thái 2026-07-12:** hoàn tất. `git ls-files` xác nhận **không có** `.env`/build/cache/signing material bị track. Root `.gitignore` phủ toàn diện (node_modules/dist/build/.expo/.env·!.env.example/*.local/keystore/jks/ios·Pods/xcworkspace/`**/src/api/generated`/.DS_Store) áp cho mọi sub-app. `.env.example` tracked đúng ở api/crm/platform.
- **Đã sửa:** `kids-mobile-native/.gitignore` thiếu `!.env.example` (pattern `.env.*` của app con override negation của root) → thêm `!.env.example` để `.env.example` onboarding sau này không bị ignore mất. `git check-ignore` xác nhận sau fix negation thắng.
- **Ghi chú (không sửa):** mobile-web/native chưa có file `.env.example` on-disk (dùng `.env.local`/`EXPO_PUBLIC_API_URL`) — gap onboarding nhỏ, thuộc BL-005, không phải rủi ro bảo mật.
- **Evidence:** `git status --short` sau rà chỉ có `kids-mobile-native/.gitignore`; `git status --ignored` xác nhận `.env` thật (kids-api/.env, native/.env.local) + dist/node_modules đều được ignore đúng.
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

---

## 📊 Bảng tổng hợp tình trạng & thứ tự ưu tiên trước production

> Cập nhật 2026-07-12. Sắp xếp **từ trên xuống theo mức chặn production** — hàng trên = phải chốt trước, vì sai/hoãn sẽ gây **hotfix lan rộng DB → API → mọi FE/Mobile** (bán kính ảnh hưởng lớn nhất). Đọc: các "landmine" bán kính lớn nhất (schema/contract/auth) **đã DONE**; phần còn chặn prod chủ yếu là **deploy + smoke + text pháp lý**, không phải code.
>
> Chú thích trạng thái: ✅ xong · 🟢 đang xanh (gate lặp mỗi deploy) · ⚠️ code xong, còn phần dữ liệu/nội dung · ⬜ chưa làm (chặn prod) · 🔒 chờ input ngoài (domain/pháp nhân/provider) · ⏳ hoãn (không chặn 5 trường đầu).

### A. Trước khi mở trường thật (P0-PROD) — theo thứ tự làm

| # | Task | Việc | Repo ảnh hưởng | Rủi ro hotfix nếu sai/hoãn | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 1 | BL-052 | Soft-delete + retention bảng thuế/y tế/trẻ | DB · API | Cascade xóa sạch chứng từ thuế/y tế; sửa sau = migrate + backfill + vá nhiều delete path | ✅ |
| 2 | BL-053 | Timezone `@db.Timestamptz(3)` | DB | Đổi kiểu cột sau khi có rows = `ALTER` khóa bảng | ✅ |
| 3 | BL-054 | Invoice-number an toàn concurrency (`InvoiceCounter`) | API | Số hóa đơn thuế nhảy/trùng/500 khi tạo đồng thời | ✅ |
| 4 | BL-050 | Versioning + bất biến giá gói | DB · API · Landing · Platform | Đổi giá làm sai hóa đơn khách cũ | ✅ |
| 5 | BL-049 | Bỏ quota lớp (bán theo GV+HS+GB) | API · DB · CRM · Landing | Sai chiều bán gói → sửa lan bảng giá + enforcement | ✅ |
| 6 | BL-056 | Same-origin FE↔API + guard `VNPAY_RETURN_URL` | ops · API · mọi FE | Cookie refresh cross-site hỏng → **auth chết toàn web/mobile** | ✅ code/docs · ⬜ smoke prod (trong BL-051) |
| 7 | BL-055 | Prod-guard JWT secret dev/low-entropy | API | Boot prod với khóa ký công khai | ✅ |
| 8 | BL-005 | CORS origins domain thật | API | Sai → toàn bộ FE bị chặn gọi API | 🔒 chờ domain |
| 9 | BL-051 | Provision + deploy (VPS/HTTPS/domain/secret/backup) | ops · all | Blocker vật lý để có prod; sai topology = auth hotfix | ⬜ đang mua VPS |
| 10 | BL-007 | Rà `.gitignore` / secrets | root · all | Lộ `.env`/key → phải rotate khẩn | ✅ |
| 11 | BL-046 | Consent pháp lý (ToS/Privacy) | API · CRM · Mobile · Landing | Hệ thống xong; thiếu text hợp lệ = rủi ro pháp lý khi mở trường | ✅ hệ thống · ⚠️ chờ text luật sư (chỉ đổi data) |
| 12 | BL-008 | Verify backend `tsc`/`lint`/`e2e` | API | Regression lọt prod | 🟢 181/21 xanh (lặp mỗi deploy) |
| 13 | BL-009 | Build/lint FE (platform/crm/mobile-web/landing/native) | mọi FE | Build vỡ lúc deploy | 🟢 build xanh (phiên 07-12: crm/platform/mobile-web/landing build ✅, native tsc+lint ✅) — lặp lại trước deploy |
| 14 | BL-001 | Seed + login demo trên prod | API | Nền cho mọi smoke | ⬜ smoke prod |
| 15 | BL-002 | Smoke CRM (toàn route P0/P1) | CRM | Phát hiện lỗi tích hợp trước bàn giao | ⬜ smoke prod |
| 16 | BL-003 | Smoke mobile-web PH/GV | Mobile-web | — | ⬜ smoke prod |
| 17 | BL-004 | Smoke landing self-service (signup/VietQR) | Landing · API | — | ⬜ smoke prod |

### B. Nên làm sớm sau launch (không chặn 5 trường đầu, giảm hotfix UX)

| # | Task | Việc | Repo ảnh hưởng | Rủi ro nếu hoãn | Trạng thái |
| --- | --- | --- | --- | --- | --- |
| 18 | BL-043 | Landing bảng giá đúng feature + badge Coming Soon | Landing | Cam kết feature chưa có → phải gỡ gấp | ✅ |
| 19 | BL-006 | Error-code mapping FE (i18n VI/EN) | mọi FE | Lộ raw error; sửa rải rác nhiều app | ✅ |
| 20 | BL-044 | Feature-gating theo gói ở FE | CRM · Mobile | "Bấm mới 403" (BE `@RequireFeature` đã là chốt an toàn) | ✅ |
| 21 | BL-045 | Chuẩn hóa/enforce cờ feature "chết" (`analytics`/`api_access`) | API | FE tưởng đã enforce | ✅ |
| 22 | BL-048 | Role-gating UI CRM (route guard + ẩn nút) | CRM | Gõ URL sai quyền (BE `@Roles` đã là chốt an toàn) | ✅ |
| 23 | BL-047 | Landing pháp nhân + thông báo Bộ Công Thương | Landing · ops | Tuân thủ TMĐT khi mở đăng ký công khai | 🔒 chờ pháp nhân/BCT |

### C. Hoãn tới >5 trường / khi có input (không chặn prod)

| Nhóm | Tasks | Việc | Trạng thái |
| --- | --- | --- | --- |
| Kiểm thử tự động | BL-010 · BL-011 · BL-012 · BL-013 | Playwright CRM/mobile-web · visual regression · chạy SYSTEM/SECURITY checklist | ⏳ hoãn |
| Mobile native release | BL-014 · BL-015 · BL-016 · BL-017 | Smoke thiết bị · upload ảnh · EAS build · deep link/tenant context | 🟡 đã port P0/P1 · ⏳ smoke/EAS/push |
| Vận hành SaaS | BL-018 · BL-019 · BL-020 · BL-021 · BL-022 · BL-023 · BL-024 | Email · reset password · lead API · dunning · coupon redeem · rotate token · PDF | ⏳ hoãn (phần lớn 🔒 input) |
| File/privacy/ops | BL-025 · BL-026 · BL-027 · BL-028 · BL-029 | R2/S3 · cleanup media · retention/purge · backup runbook · RLS trial | ⏳ hoãn (🔒 input/PO) |
| Push & thanh toán | BL-030 · BL-031 · BL-032 · BL-033 · BL-034 | Push FCM/Expo · VNPay prod · auto đối soát VietQR · MoMo/ZaloPay · VAT điện tử | ⏳ hoãn (🔒 input) |
| Sản phẩm nâng cao | BL-035 → BL-042 | Offline queue · CSV import/export · analytics · admissions · lịch thuốc · biên nhận PH · AI | ⏳ hoãn (🔒 input) |

> **Đọc nhanh:** cụm A#1–7 (bán kính hotfix lớn nhất: schema/contract/auth) **đã DONE**. Cửa còn lại để mở trường thật là **BL-051 deploy** + **BL-005/007 config-secret** + **BL-046 text luật sư** + **smoke BL-001→004 trên prod**. Nhóm B là polish UX (BE đã có chốt an toàn nên không phải blocker). Nhóm C hoãn có chủ đích.
