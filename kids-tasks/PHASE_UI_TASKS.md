# Phase UI — kids-platform + kids-crm + mobile (integrate `kids-api`)

> **Tiền đề:** API Phase 0+1 (A→G) đã đóng, 165 e2e / 18 suite ở test inventory hiện tại, và **127 flow cURL theo mock UI đã PASS** (xem [`../kids-documentation/UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md)). API coi như hợp đồng ổn định để FE tiêu thụ.
>
> **Chiến lược FE:** API-first → FE chỉ tiêu thụ. **Type-safety end-to-end**: sinh type + client từ **OpenAPI** của `kids-api`, không gõ type tay. Mỗi màn FE bám đúng thứ tự call API đã chốt trong ledger.
>
> Nguồn UI tham chiếu: `kids-landing/public/mock-ui/` (web + mobile + platform). Ưu tiên: **P0** = MVP chạy thật · **P1** = quan trọng · **P2** = sau.

---

## 0. Quyết định cần chốt trước khi code

| # | Quyết định | Đề xuất | Lý do | Trạng thái |
|---|---|---|---|---|
| D1 | Cấu trúc repo | **Mỗi app độc lập trong cùng 1 git repo (KHÔNG workspace/monorepo)** | Deploy cơ bản trên VPS, tránh phức tạp Turborepo + Expo-trong-monorepo. Mỗi app build/deploy như project chuẩn; type vẫn đồng bộ vì cùng sinh từ `kids-api/openapi.json` (xem §3) | ✅ **chốt: tách độc lập** |
| D2 | Stack CRM web (`kids-crm`) | **React + TypeScript + Vite** | Khớp mock web desktop, copy-first được pattern từ `kids-platform` | ✅ **chốt & đã triển khai** |
| D3 | Thư viện UI CRM | **Tailwind + component nhẹ tự viết** (copy pattern platform) | CRM đã đủ bảng/form/modal theo mock mà không cần kéo Mantine/AntD; giảm phụ thuộc và giữ visual đồng nhất | ✅ **chốt thực tế** |
| D4 | Stack mobile | **2 bản tách:** `kids-mobile-web` = React+Vite PWA, `kids-mobile-native` = Expo React Native | Web PWA đã tối ưu riêng; native dùng Expo để lên iOS/Android, chia sẻ logic bằng copy-first | ✅ **chốt thực tế** |
| D5 | Vai trò `kids-mobile-native` vs `kids-mobile-web` | **2 codebase tách, chia sẻ logic bằng copy-first.** `kids-mobile-web` = app React + Vite PWA **độc lập** (ĐÃ XONG); `kids-mobile-native` = app **Expo riêng**, copy `src/api`+`src/i18n`+`src/lib` từ mobile-web, **chỉ viết lại UI** (RN + NativeWind + expo-router) | (Cập nhật 2026-06-28) Ban đầu chốt "hợp nhất 1 Expo + web-export", **đảo lại** vì thực tế đã build mobile-web thành app Vite riêng (PWA tối ưu hơn react-native-web). Giữ web Vite + native Expo, chia sẻ **tầng logic** qua copy → đổi logic thì diff cơ học sang native | ✅ **chốt lại: copy-first, 2 codebase** |
| D6 | Server-state | **TanStack Query (React Query)** cho cả platform/CRM/mobile | Hợp REST + cache + retry 401→refresh; các app FE chính đều dùng React Query | ✅ |
| D7 | Codegen từ OpenAPI | **openapi-typescript spec mỏng** từ `kids-api/openapi.json` + type body/response khai tay theo ledger | Đúng pipeline hiện tại: root `gen:api` sinh `api.d.ts` rồi copy vào app; tránh đổi backend đã ổn định | ✅ **chốt & đã dựng** |
| D8 | Form + validate | (thực tế) **state thuần + validate ở backend**; react-hook-form/zod **chưa dùng** | Form hiện tại đủ với state thuần + backend Zod; cân nhắc rhf+zod khi có form nhiều bước/import | ✅ **chốt thực tế** |
| D9 | Platform Console: gộp vào CRM hay tách app | **Tách app riêng `kids-platform/`** | Khác **realm quyền** (platform role vs tenant role), khác **host** (`admin.*` vs `<slug>.*`), khác đối tượng & deploy. Vẫn dùng chung `kids-api/openapi.json` để sinh client nên chi phí tách thấp. Impersonate = handoff sang kids-crm kèm token | ✅ **chốt: tách riêng** |

> ⚠️ D1/D5/D9 là các điểm rẽ kiến trúc — đã chốt.
>
> **Cập nhật quan trọng (2026-06-28):**
> - **D5 đảo hướng** → copy-first 2 codebase (xem ô D5). `kids-mobile-web` đã hoàn thiện thành app Vite riêng.
> - **Chọn tenant độc lập subdomain:** CRM + mobile login bằng **dropdown chọn trường** (`GET /public/tenants`) → gửi header **`x-tenant`**; backend resolve `SILO → Host → x-tenant → JWT` (xem [`MULTI_TENANCY.md`](../kids-documentation/MULTI_TENANCY.md)). Vite proxy CRM/mobile **không còn ghim Host**; platform vẫn ghim `Host=admin.*`.
> - **D7 thực tế:** platform + crm dùng `src/api/generated/api.d.ts`; **mobile-web gõ tay 100%** module `src/api/*` (không copy generated). Cả 3 dùng react-query.

---

## 1. Hợp đồng tích hợp (BẮT BUỘC mọi FE tuân thủ)

Rút ra từ quá trình test cURL — chi tiết & ví dụ ở [`UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md).

1. **Base URL** `/<prefix>` mặc định `http://localhost:3000/api`. Swagger ở `/docs` (chỉ non-prod).
2. **Response envelope**: thành công `{ success:true, data, meta? }`; lỗi `{ success:false, error:{ code, message } }`.
   → Client phải **bóc `data`** trước khi trả cho UI, và **ném theo `error.code`** (map sang thông báo tiếng Việt). Làm tại **1 mutator chung**, không rải rác.
3. **Multi-tenant theo `Host`**: API phân giải tenant qua subdomain (`<slug>.kimthanhkids.vn`); platform console dùng `admin.kimthanhkids.vn`. `kids-platform` dev dùng Vite proxy set `Host: admin.kimthanhkids.vn`; CRM/mobile dev cần host/subdomain tương ứng (xem §2).
4. **Auth**: `POST /auth/login {identifier|email, password}` → `{ accessToken, refreshToken, userId }`. Gắn `Authorization: Bearer`. `401` → thử `POST /auth/refresh {refreshToken}` 1 lần rồi logout nếu vẫn hỏng. Token impersonate (platform) **không có refresh**.
5. **Hai realm quyền tách biệt** (quyết định màn/nút + app nào dùng được):
   - **Platform** (`PLATFORM_SUPER_ADMIN`, `PLATFORM_BILLING`, `tenantId=null`) → chỉ `kids-platform`, host `admin.*`, route `/platform/*`.
   - **Tenant** (`SCHOOL_ADMIN/PRINCIPAL` full CRM · `TEACHER/NURSE/FINANCE` giới hạn · `PARENT` chỉ con mình qua `/mine` + `/student/:id`) → kids-crm + mobile, host `<slug>.*`.
   Backend vẫn chặn 403 — FE chỉ ẩn cho UX.
6. **Field/enum chính xác**: date `YYYY-MM-DD`; announcement dùng `body`; phone `^(0|\+84)\d{8,10}$`; bankBin 6 số. Đầy đủ trong ledger + Swagger.
7. **Upload ảnh**: `multipart POST /media?kind=...` (field `file`) → `{ id, url }`; dùng `id` cho album/avatar. Ảnh được nén về webp.
8. **Phân trang**: list lớn nhận `?page=` (20/trang); đọc `meta` cho tổng/skip.
9. **Tiền tệ**: VND số nguyên (không thập phân).

---

## 2. Môi trường dev (làm 1 lần)

- [x] **Platform dev proxy:** `kids-platform` gọi `/api/*` qua Vite proxy sang `:3000` và set `Host: admin.kimthanhkids.vn` (xem `kids-platform/README.md`).
- [x] **CRM/mobile chọn tenant ở login (độc lập subdomain):** dropdown search `GET /public/tenants` → gửi header **`x-tenant: <tenantId>`** khi login (xem `src/api/http.ts` + component `TenantSelect`). Vite proxy CRM/mobile **không còn ghim Host** (đẩy về localhost → middleware không resolve tenant → x-tenant + JWT điều khiển). Platform giữ ghim `Host=admin.kimthanhkids.vn`.
- [x] **Font `@fontsource` + pnpm dedup:** realpath file font trỏ ra ngoài thư mục app (pnpm hardlink store) → thêm `server.fs.allow=[".."]` ở `vite.config` mỗi FE để tránh **403** lúc dev. KHÔNG ảnh hưởng `vite build` (production bundle font bình thường).
- [ ] **CORS**: thêm origin dev của CRM/mobile vào `API_CORS_ORIGINS` (hiện có `:5173,:3000`). Bổ sung subdomain khi truy cập qua host thật.
- [ ] **Seed demo**: `pnpm prisma:seed:demo` cho tenant `demo` (gói PRO, đủ data) để dev UI không phải tự tạo.
- [ ] **`.gitignore`** mỗi app FE (`node_modules`, `dist`, `.expo`, `.env`).

---

## 3. Type-safe KHÔNG cần monorepo — sinh từ `openapi.json` chung rồi copy vào app

> Đã dựng (xem [`../DEVELOPMENT.md`](../DEVELOPMENT.md)): root `package.json` + `scripts/gen-api.mjs` sinh type chung → **copy** vào `src/api/generated/` từng app (copy thay vì alias để Metro/Expo + build VPS khỏi vướng). Đánh đổi: **regen + copy** khi API đổi (1 lệnh `pnpm gen:api --fresh`).

**Đã xong:**
- [x] `kids-api` script `openapi:json` → `kids-api/openapi.json` (commit làm nguồn chung).
- [x] Root `gen:api` (openapi-typescript) sinh `api-client/generated/api.d.ts` → copy vào từng app (bỏ qua app chưa scaffold).

**Quyết định về độ giàu spec (đã chốt):** **dùng spec mỏng hiện tại** — type có sẵn **path + param + operationId**; **body/response gõ type tay** theo ledger + Swagger khi dựng từng màn. KHÔNG đụng backend đã đóng băng (tránh rủi ro đổi error envelope `{code,message}` mà 127 cURL + 165 e2e đang dựa vào). Nếu sau này gõ tay quá nhiều → làm giàu spec bằng `@asteasolutions/zod-to-openapi` (additive, không đổi runtime) → pipeline tự tốt lên, không phải sửa plumbing.

**Mỗi app cần (P0, khi scaffold):**
- [x] **`kids-platform/src/api/http.ts`** — đã có lớp HTTP mẫu (bóc envelope, auth, refresh 401, `getPage` giữ meta).
- [x] **Lớp `http.ts` cho CRM/mobile (~1 file/app)** — mỗi app giữ bản riêng (lặp nhẹ, khỏi workspace):
  - [x] gắn base URL + `Authorization`; CRM/mobile-web/native gửi thêm **`x-tenant`** từ dropdown login và `x-language`;
  - [x] **bóc `data`** khi `success:true`, **ném `ApiError(code,message,status)`** khi `success:false`;
  - [x] interceptor `401 → refresh → retry once → logout`;
  - [x] dùng type generated cho platform/CRM/native khi hữu ích; mobile-web/native chủ yếu khai type body/response theo domain module.
- [x] **TanStack Query** bọc các call; **Lưu token** có chủ đích: web → `localStorage`, native → `expo-secure-store`/MMKV adapter. _(Cập nhật vòng 14 bảo mật: web chuyển refresh token sang **cookie `HttpOnly`** + access **in-memory**, bỏ localStorage — xem `SECURITY_AUDIT_CHECKLIST.md` §9.)_
- [ ] Map `error.code` → thông điệp tiếng Việt (vd `NO_BANK_CONFIG`, `SLUG_UNAVAILABLE`, `FORBIDDEN`, quota…).
- [ ] **Quy ước**: API đổi → ở `kids-api` chạy `openapi:json` → vào từng app chạy `pnpm gen:api` → `tsc` bắt lỗi.

---

## 4. kids-platform (Console chủ Kim Thanh) — app tách riêng

> Đối tượng: nhân viên Kim Thanh (chủ SaaS). Host `admin.kimthanhkids.vn`, realm **platform role**. Tiêu thụ flow **Platform Tenant** trong ledger. Stack hiện tại: React + Vite + TypeScript + Tailwind + TanStack Query; `src/api/http.ts` là mẫu để copy sang CRM/mobile.

**P0 (đủ để vận hành bán hàng + cấp tenant):**
- [x] App shell: login platform (`/auth/login`), auth guard, sidebar/bottom-nav responsive.
- [x] Dashboard nền tảng (`GET /platform/overview`, revenue series, quick search).
- [x] Tenants: list/detail (`/platform/tenants`), **tạo trường**, suspend/reactivate.
- [x] **Gói dịch vụ:** list + tạo + sửa gói (`GET/POST/PATCH /platform/plans`) — giá/limit/feature.
- [x] **Coupon:** list + tạo (`GET/POST /platform/coupons`).
- [x] Subscriptions các trường (`GET /platform/subscriptions`, stats).
- [x] Hóa đơn nền tảng: list, detail/public link, tạo kỳ, mark-paid (`/platform/invoices`).

**P1 đã có:** entitlement override (nâng/giảm hạn mức 1 trường), **impersonate** → handoff sang tenant token (token không refresh), observability (`usage/overview` + `platform/audit`), worklist công nợ/trial/quota sắp đầy, platform settings (bank + grace dunning).
**P2 còn lại:** email dunning tự động, coupon redeem thực tế, revoke/rotate public invoice token, PDF server-side, impersonate chọn role/user cụ thể khi CRM/mobile có UI.

---

## 5. kids-crm (Web chủ trường/nhân sự) — làm sau platform, chốt pattern tenant

> Tracker chi tiết cho CRM: [`PHASE_CRM_TASKS.md`](./PHASE_CRM_TASKS.md). Khi làm CRM, ưu tiên file này làm checklist vận hành: mock HTML -> BE/API cURL -> UI -> integrate -> seed/self-test.

> Tiêu thụ flow **CRM chủ trường** (49 case). Host `<slug>.kimthanhkids.vn`, realm **tenant role**. Map 1-1 với `mock-ui/web/`.
>
> **Trạng thái hiện tại (2026-07-02):** `kids-crm` đã copy-first từ `kids-platform`, login chọn trường qua `/public/tenants` + `x-tenant`, i18n VI/EN, và nối API thật cho toàn bộ mục nav P0/P1 chính. Còn cần smoke test dev đầy đủ khi Docker/Postgres local sẵn, visual regression theo mock và E2E FE nếu chuẩn bị release.

**P0 (MVP một trường chạy thật):**
- [x] App shell: login (`/auth/login`), layout theo role, guard route, refresh token, chọn tenant qua dropdown + `x-tenant`.
- [x] Dashboard (`GET /dashboard/summary`).
- [x] Lớp học: list/detail/tạo/sửa/xóa mềm (`/classrooms`) + xử lý quota.
- [x] Học sinh: list/detail/tạo/sửa/xóa mềm + gán phụ huynh (`/students`, `/students/:id/guardians`).
- [x] Nhân sự: tạo/đổi trạng thái/reset mật khẩu thành viên (`/tenant/members`).
- [x] Điểm danh (`/attendance/mark`, list theo lớp/ngày).
- [x] Học phí: tạo hóa đơn, list, chi tiết, **thu tiền mặt/chuyển khoản**, **VietQR**, **in HTML**, hủy hóa đơn (`/tuition/...`).
- [x] Thông báo: soạn/draft/publish/feed (`/announcements`, field `body`).
- [x] Cài đặt trường + **tài khoản ngân hàng** (`PATCH /tenant/settings`) — cần trước khi dùng VietQR.

**P1 đã nối:** báo cáo ngày, sức khỏe/dị ứng, thuốc (duyệt/từ chối/đã cho uống), sự cố, phân công trực, đơn nghỉ, thực đơn tuần + cảnh báo dị ứng, notifications feed/preferences, pickup, nhật ký kiểm toán (`/audit-logs`).
**P2 một phần đã nối:** album ảnh/upload và lesson-plan (feature-gate theo gói). **Còn lại:** VNPay checkout thật trong CRM, import/export nâng cao, dashboard analytics nâng cao, visual regression/E2E FE.

---

## 6. Mobile — GV + PH (2 codebase: web Vite đã xong · native Expo copy-first)

> Tiêu thụ flow **App mobile GV + PH** (55 case). Map với `mock-ui/mobile/`.
>
> **Trạng thái (2026-07-02):**
> - ✅ **`kids-mobile-web` (React + Vite PWA)** đã tích hợp API thật + i18n VI/EN + login chọn trường (x-tenant) + hầu hết P0/P1 dưới đây. Chi tiết & việc còn lại: [`../kids-mobile-web/MOBILE_WEB_TASKS.md`](../kids-mobile-web/MOBILE_WEB_TASKS.md), kịch bản: [`../kids-mobile-web/FE_TEST_SCENARIOS.md`](../kids-mobile-web/FE_TEST_SCENARIOS.md).
> - 🟡 **`kids-mobile-native` (Expo)** đã khởi tạo SDK 56 + expo-router/NativeWind/React Query/SecureStore/MMKV/FlashList, copy `src/api`+`src/i18n`+`src/lib` từ mobile-web và port nhiều màn P0/P1. Còn cần smoke thiết bị thật, EAS/dev build, upload ảnh native và push FCM/Expo; xem [`PHASE_MOBILE_NATIVE_TASKS.md`](./PHASE_MOBILE_NATIVE_TASKS.md).

**P0 — Giáo viên (home-teacher):**
- [x] Login + home (compose từ API role truy cập được), class-roster (`/students?classroomId=`).
- [x] Điểm danh (`/attendance/mark`), sổ liên lạc (`/daily-reports`), thông báo lớp.
- [x] Notifications (`/notifications`, preferences/read/read-all).

**P0 — Phụ huynh (home-parent):**
- [x] Login + home, **con của tôi** (`/students/mine`).
- [x] Lịch sử điểm danh/báo cáo/sức khỏe của con (`/.../student/:id`).
- [x] Hóa đơn của tôi (`/tuition/invoices/mine`), chi tiết + **VietQR** + **VNPay sandbox checkout**.
- [x] Gửi cấp thuốc (`/medicine`), xin nghỉ (`/leave`), notifications.

**P1 đã nối:** GV duyệt thuốc/đơn nghỉ, thực đơn tuần, album (feature `media_gallery`), lesson-plan (feature `lesson_plan`), GV upload ảnh báo cáo ngày trên mobile-web, PH xem ảnh trong feed.
**P2 còn lại:** offline queue/cache, visual regression/E2E FE, push FCM/Expo (đi cùng [Phase 2 hạ tầng](./ROADMAP.md) — tái dùng `NotificationsService.notify` làm điểm phát), upload ảnh native qua image-picker.

---

## 7. Định nghĩa "Xong" cho phase UI

- [ ] Mỗi màn map đúng flow trong ledger; lỗi hiển thị theo `error.code`.
- [ ] Type FE sinh từ OpenAPI, `tsc` sạch ở mọi app; đổi API → regen → bắt lỗi compile.
- [x] Platform: Kim Thanh tạo được tenant + cấu hình/bán gói + coupon + hóa đơn nền tảng.
- [x] CRM: 1 chủ trường có đủ màn/API để vận hành trọn vẹn 1 ngày (điểm danh → báo cáo → hóa đơn → thông báo); còn cần smoke/E2E FE trước release.
- [ ] Mobile native chạy iOS + Android qua Expo trên thiết bị thật/dev build; web PWA đã có riêng.
- [ ] Không quảng bá tính năng chưa có (chat realtime đã loại; push FCM = phase mobile/P2).

---

## 8. Thứ tự đề xuất

1. ✅ Chốt kiến trúc **D1 (app độc lập, không monorepo) · D5 (copy-first, 2 codebase) · D9 (tách kids-platform)**.
2. ✅ Ở `kids-api`: `openapi:json` + commit `openapi.json` (§3) — **nguồn type chung**.
3. ✅ **kids-platform P0/P1 chính** (§4) — lớp `http` + `gen:api` + các trang vận hành nền tảng + field `code`.
4. ✅ **kids-crm** (§5) — đã nối API thật cho toàn bộ mục nav P0/P1 chính; tiếp theo là smoke/E2E/visual regression và polish release (xem [`PHASE_CRM_TASKS.md`](./PHASE_CRM_TASKS.md)).
5. 🟡 **mobile** (§6) — ✅ **`kids-mobile-web` đã tích hợp gần hết P0/P1**; 🟡 **`kids-mobile-native` (Expo)** đã scaffold/port copy-first, còn test thiết bị thật/EAS/upload ảnh native.
6. P1 → P2 mỗi app theo nhu cầu vận hành thật.

> Lưu ý: platform và CRM **có thể làm song song** vì API cả 2 đã PASS và độc lập realm; thứ tự trên là nếu làm tuần tự.
</content>
