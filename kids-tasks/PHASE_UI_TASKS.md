# Phase UI — kids-platform + kids-crm + mobile (integrate `kids-api`)

> **Tiền đề:** API Phase 0+1 (A→G) đã đóng, 114 e2e / 13 suite ở test inventory hiện tại, và **127 flow cURL theo mock UI đã PASS** (xem [`../kids-documentation/UI_API_FLOW_TEST.md`](../kids-documentation/UI_API_FLOW_TEST.md)). API coi như hợp đồng ổn định để FE tiêu thụ.
>
> **Chiến lược FE:** API-first → FE chỉ tiêu thụ. **Type-safety end-to-end**: sinh type + client từ **OpenAPI** của `kids-api`, không gõ type tay. Mỗi màn FE bám đúng thứ tự call API đã chốt trong ledger.
>
> Nguồn UI tham chiếu: `kids-landing/public/mock-ui/` (web + mobile + platform). Ưu tiên: **P0** = MVP chạy thật · **P1** = quan trọng · **P2** = sau.

---

## 0. Quyết định cần chốt trước khi code

| # | Quyết định | Đề xuất | Lý do | Trạng thái |
|---|---|---|---|---|
| D1 | Cấu trúc repo | **Mỗi app độc lập trong cùng 1 git repo (KHÔNG workspace/monorepo)** | Deploy cơ bản trên VPS, tránh phức tạp Turborepo + Expo-trong-monorepo. Mỗi app build/deploy như project chuẩn; type vẫn đồng bộ vì cùng sinh từ `kids-api/openapi.json` (xem §3) | ✅ **chốt: tách độc lập** |
| D2 | Stack CRM web (`kids-crm`) | **React + TypeScript + Vite** | CORS đã whitelist `:5173`; mock-ui là web desktop; hệ sinh thái table/form admin tốt | ◻️ |
| D3 | Thư viện UI CRM | **Mantine** (hoặc Ant Design) | CRM nhiều bảng/form → cần DataTable/Form sẵn; Mantine free, hooks tốt; AntD nếu thích table mạnh | ◻️ |
| D4 | Stack mobile | **Expo (React Native + react-native-web)** — 1 codebase → iOS + Android + Web | Memory: mobile luôn làm cả 3 nền tảng. Expo build được cả 3 từ 1 nguồn | ◻️ |
| D5 | Vai trò `kids-mobile-native` vs `kids-mobile-web` | **Hợp nhất 1 codebase Expo** ở `kids-mobile-native`; `kids-mobile-web` = bản **web export** (PWA) của chính nó | Tránh maintain 2 codebase trùng. Nếu sau muốn tách PWA riêng thì nâng cấp `kids-mobile-web` thành codebase độc lập | ✅ **chốt: hợp nhất Expo** |
| D6 | Server-state | **TanStack Query (React Query)** cho cả platform/CRM/mobile | Hợp REST + cache + retry 401→refresh; `kids-platform` đã dùng React Query | 🟡 platform xong |
| D7 | Codegen từ OpenAPI | **openapi-typescript spec mỏng** từ `kids-api/openapi.json` + type body/response khai tay theo ledger | Đúng pipeline hiện tại: root `gen:api` sinh `api.d.ts` rồi copy vào app; tránh đổi backend đã ổn định | ✅ **chốt & đã dựng** |
| D8 | Form + validate | **react-hook-form + zod** (tái dùng shape Zod backend) | Đồng bộ rule với DTO backend (date `YYYY-MM-DD`, phone, v.v.) | ◻️ |
| D9 | Platform Console: gộp vào CRM hay tách app | **Tách app riêng `kids-platform/`** | Khác **realm quyền** (platform role vs tenant role), khác **host** (`admin.*` vs `<slug>.*`), khác đối tượng & deploy. Vẫn dùng chung `kids-api/openapi.json` để sinh client nên chi phí tách thấp. Impersonate = handoff sang kids-crm kèm token | ✅ **chốt: tách riêng** |

> ⚠️ D1/D5/D9 là các điểm rẽ kiến trúc — đã chốt.

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
- [ ] **CRM/mobile subdomain → localhost:** thêm `/etc/hosts` (`demo.kimthanhkids.vn`, `app.kimthanhkids.vn` → `127.0.0.1`) **hoặc** dùng proxy giữ Host. Chốt 1 cách và ghi vào README mỗi app khi scaffold.
- [ ] **CORS**: thêm origin dev của CRM/mobile vào `API_CORS_ORIGINS` (hiện có `:5173,:3000`). Bổ sung subdomain khi truy cập qua host thật.
- [ ] **Seed demo**: `pnpm prisma:seed:demo` cho tenant `demo` (gói PRO, đủ data) để dev UI không phải tự tạo.
- [ ] **`.gitignore`** mỗi app FE (`node_modules`, `dist`, `.expo`, `.env`).

---

## 3. Type-safe KHÔNG cần monorepo — sinh từ `openapi.json` chung rồi copy vào app

> Đã dựng (xem [`../DEVELOPMENT.md`](../DEVELOPMENT.md)): root `package.json` + `scripts/gen-api.mjs` sinh type chung → **copy** vào `src/api/generated/` từng app (copy thay vì alias để Metro/Expo + build VPS khỏi vướng). Đánh đổi: **regen + copy** khi API đổi (1 lệnh `pnpm gen:api --fresh`).

**Đã xong:**
- [x] `kids-api` script `openapi:json` → `kids-api/openapi.json` (commit làm nguồn chung).
- [x] Root `gen:api` (openapi-typescript) sinh `api-client/generated/api.d.ts` → copy vào từng app (bỏ qua app chưa scaffold).

**Quyết định về độ giàu spec (đã chốt):** **dùng spec mỏng hiện tại** — type có sẵn **path + param + operationId**; **body/response gõ type tay** theo ledger + Swagger khi dựng từng màn. KHÔNG đụng backend đã đóng băng (tránh rủi ro đổi error envelope `{code,message}` mà 127 cURL + 114 e2e đang dựa vào). Nếu sau này gõ tay quá nhiều → làm giàu spec bằng `@asteasolutions/zod-to-openapi` (additive, không đổi runtime) → pipeline tự tốt lên, không phải sửa plumbing.

**Mỗi app cần (P0, khi scaffold):**
- [x] **`kids-platform/src/api/http.ts`** — đã có lớp HTTP mẫu (bóc envelope, auth, refresh 401, `getPage` giữ meta).
- [ ] **Lớp `http.ts` cho CRM/mobile (~1 file/app)** — mỗi app giữ bản riêng (lặp nhẹ, khỏi workspace):
  - [ ] gắn base URL + `Host` (theo tenant/host của app) + `Authorization`;
  - [ ] **bóc `data`** khi `success:true`, **ném `ApiError(code,message)`** khi `success:false`;
  - [ ] interceptor `401 → refresh → retry once → logout`;
  - [ ] dùng type từ `src/api/generated/api.d.ts` cho path/param; khai type body/response tại chỗ gọi (theo ledger).
- [ ] **TanStack Query** bọc các call; **Lưu token** an toàn: web → `localStorage` có chủ đích, mobile → `expo-secure-store`.
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

**P0 (MVP một trường chạy thật):**
- [ ] App shell: login (`/auth/login`), layout theo role, guard route, refresh token, chọn tenant theo host.
- [ ] Dashboard (`GET /dashboard/summary`).
- [ ] Lớp học: list/detail/tạo/sửa (`/classrooms`) + xử lý quota (gói free=2 → thông báo nâng gói).
- [ ] Học sinh: list/detail/tạo/sửa + gán phụ huynh (`/students`, `/students/:id/guardians`).
- [ ] Nhân sự: tạo/đổi trạng thái thành viên (`/tenant/members`).
- [ ] Điểm danh (`/attendance/mark`, list theo lớp/ngày).
- [ ] Học phí: tạo hóa đơn, list, chi tiết, **thu tiền mặt**, **VietQR**, **in HTML**, **xuất CSV** (`/tuition/...`).
- [ ] Thông báo: soạn/phát/feed (`/announcements`, field `body`).
- [ ] Cài đặt trường + **tài khoản ngân hàng** (`PATCH /tenant/settings`) — cần trước khi dùng VietQR.

**P1:** báo cáo ngày, sức khỏe/dị ứng, thuốc (duyệt), sự cố, phân công trực, thực đơn tuần, nhật ký kiểm toán (`/audit-logs`).
**P2:** album ảnh, lesson-plan (cần gói bật feature), VNPay checkout, dashboard nâng cao.

---

## 6. Mobile (Expo: iOS + Android + Web) — làm SAU CRM

> Tiêu thụ flow **App mobile GV + PH** (55 case). Map với `mock-ui/mobile/`.

**P0 — Giáo viên (home-teacher):**
- [ ] Login + home (phân công của tôi `/assignments/mine`), class-roster (`/students?classroomId=`).
- [ ] Điểm danh (`/attendance/mark`), sổ liên lạc (`/daily-reports`), thông báo lớp.
- [ ] Notifications (`/notifications`, unread-count, read).

**P0 — Phụ huynh (home-parent):**
- [ ] Login + home, **con của tôi** (`/students/mine`).
- [ ] Lịch sử điểm danh/báo cáo/sức khỏe của con (`/.../student/:id`).
- [ ] Hóa đơn của tôi (`/tuition/invoices/mine`), chi tiết + **VietQR** + **VNPay checkout**.
- [ ] Gửi cấp thuốc (`/medicine`), xin nghỉ (`/leave`), notifications.

**P1:** GV duyệt thuốc/đơn nghỉ, thực đơn tuần, album (feature `media_gallery`), lesson-plan (feature `lesson_plan`), upload ảnh (`/media`).
**P2:** PWA polish (kids-mobile-web), offline cache, **push FCM/Expo** (đi cùng [Phase 2 hạ tầng](./ROADMAP.md) — tái dùng `NotificationsService.notify` làm điểm phát).

---

## 7. Định nghĩa "Xong" cho phase UI

- [ ] Mỗi màn map đúng flow trong ledger; lỗi hiển thị theo `error.code`.
- [ ] Type FE sinh từ OpenAPI, `tsc` sạch ở mọi app; đổi API → regen → bắt lỗi compile.
- [x] Platform: Kim Thanh tạo được tenant + cấu hình/bán gói + coupon + hóa đơn nền tảng.
- [ ] CRM: 1 chủ trường vận hành trọn vẹn 1 ngày (điểm danh → báo cáo → hóa đơn → thông báo).
- [ ] Mobile chạy iOS + Android + Web từ 1 codebase Expo.
- [ ] Không quảng bá tính năng chưa có (chat realtime đã loại; push FCM = phase mobile/P2).

---

## 8. Thứ tự đề xuất

1. ✅ Chốt kiến trúc **D1 (app độc lập, không monorepo) · D5 (Expo hợp nhất) · D9 (tách kids-platform)**.
2. Ở `kids-api`: thêm script `openapi:json` + commit `openapi.json` (§3) — **nguồn type chung**.
3. ✅ **kids-platform P0/P1 chính** (§4) — đã dựng lớp `http` + `gen:api` mẫu và các trang vận hành nền tảng.
4. **kids-crm P0** (§5) — chốt pattern auth/tenant/query/form/error cho realm tenant (tái dùng cho mobile).
5. **mobile P0** (§6) — GV + PH, tái dùng pattern + client từ bước 4.
6. P1 → P2 mỗi app theo nhu cầu vận hành thật.

> Lưu ý: platform và CRM **có thể làm song song** vì API cả 2 đã PASS và độc lập realm; thứ tự trên là nếu làm tuần tự.
</content>
