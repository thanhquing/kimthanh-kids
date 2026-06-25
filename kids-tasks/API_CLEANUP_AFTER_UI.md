# API cleanup sau khi tích hợp UI (kids-platform)

> File tạm — gom các điểm API **dư thừa / chồng chéo** lộ ra khi nối UI mới (match mock-ui 100%) với backend.
> KHÔNG xử lý ngay; rà & dọn 1 lượt ở cuối khi UI các trang đã ổn định, tránh xoá nhầm thứ còn dùng.

## ✅ KẾT LUẬN AUDIT (2026-06-25 — sau khi 7 trang platform đã xong)

Đã đối chiếu **từng endpoint platform ↔ caller FE ↔ e2e**. **Không có code dead/dư để xoá an toàn:**

- **21/21 route platform** đều có ≥1 caller FE + test (kể cả suspend/reactivate/impersonate/setEntitlement → wired ở tenant-detail; `mrr/backfill` là ops endpoint super-admin, có e2e).
- **21/21 method `platform.X`** ở FE đều có caller; mọi `export type` là contract sống (dùng làm generic `api.get<T>`).
- Các "chồng chéo" bên dưới đều là **giữ riêng có chủ đích** (ngữ nghĩa/đối tượng khác nhau) — gộp lại là refactor tối ưu, KHÔNG phải dọn rác → **không làm** (rủi ro > lợi).
- Orphan duy nhất: `kids-platform/src/api/generated/api.d.ts` (93KB, không ai import) — **không track git** + regenerable qua `pnpm gen:api` → để nguyên.

→ "Cleanup" thực chất = đóng sổ tracker này. Các mục dưới giữ làm **nhật ký quyết định**.

## 1. Dashboard  ✅ đã tích hợp (endpoint `GET /platform/overview`)

### 1.1. `GET /platform/usage/overview` (UsageService.overview) — trùng một phần với `/platform/overview` mới

- **Hiện trạng:** Trả `tenants, activeTenants, users, dau, wau, mau, topEvents`.
- **Sau tích hợp:** Dashboard mới dùng `GET /platform/overview` (KPI trial/overdue/suspended/MRR + phân bổ gói + 2 list). FE **không còn dùng** `dau/wau/mau/users/topEvents`.
- **Chồng chéo:** cả 2 endpoint đều `count` `tenants` + `activeTenants`.
- **Quyết định (CHỐT):**
  - [x] **GIỮ `usage/overview`** — là nguồn DAU/WAU/MAU/topEvents **duy nhất** (`overview` không có); `UsageService` còn dùng để ghi event login (auth.service). **Đã có UI tiêu thụ: trang Theo dõi vận hành (`/observability`)** — không còn là endpoint mồ côi. Không gộp.
  - Trùng nhẹ phần `count tenants/activeTenants` là chấp nhận được (2 query rẻ, ngữ cảnh khác).

### 1.2. FE type `Overview` cũ (kids-platform/src/api/platform.ts) — field thừa  ✅ ĐÃ XONG

- Type `Overview` cũ (`users/dau/wau/mau/topEvents`) **đã bị xoá**; `platform.ts` chỉ còn `DashboardOverview` (shape của `/platform/overview`). Grep toàn `kids-platform/src` không còn `dau/wau/mau/topEvents/Overview` (ngoài `DashboardOverview`).

## 2. Tenants  ✅ đã tích hợp

- `listTenants` trả thêm `planTier/billingCycle/studentCount/mrr` + meta phân trang; `GET /platform/tenants/stats` cho chip; `?q=` search server-side.
- FE `api.getPage` (trả `{items,meta}`) — list khác giờ nên migrate dần sang dạng này.

## 3. Subscriptions  ✅ đã tích hợp (`GET /platform/subscriptions` + `/subscriptions/stats`)

- `listSubscriptions` đổi trả về: thêm `tenantName/tenantSlug/mrr/autoRenew` mỗi dòng + **meta phân trang** (trước chỉ `{page,pageSize}`, thiếu `total`). FE chuyển `api.get`→`api.getPage`.
- **`autoRenew` là field DẪN XUẤT** (`!cancelAtPeriodEnd`), KHÔNG có cột thật trong DB — nếu sau này cần "tắt auto-renew" thì set `Subscription.cancelAtPeriodEnd=true` (đã có cột). FE type `Subscription.autoRenew` cũ từng dùng nhưng BE chưa trả → nay BE trả đúng.
- `GET /platform/subscriptions/stats` (đếm theo trạng thái) — **chồng chéo nhẹ** với `tenants/stats` (cùng ý nghĩa active/trial/pastdue/suspended vì 1 tenant = 1 subscription). Giữ riêng vì ngữ nghĩa khác (thuê bao vs trường) + có thêm CANCELED/EXPIRED. **Quyết định (CHỐT 2026-06-25): GIỮ RIÊNG** — gộp `/platform/stats` là tối ưu nhỏ nhưng phải sửa 2 trang + test, lợi không bõ. Mở lại nếu sau cần 1 màn hình tổng hợp.
- KPI "Đã hủy/hết hạn" = `CANCELED + EXPIRED` (gộp ở FE).

## 4. Invoices  ✅ đã tích hợp (`GET /platform/invoices` + `/invoices/stats`)

- `listInvoices` thêm `q` (tìm theo `invoiceNumber`) + map mỗi dòng: `tenantName` (tra theo tenantId — PlatformInvoice KHÔNG có quan hệ `tenant`), `period` (MM/YYYY từ `periodStart`), `dueDate` (alias `dueAt`), `amountDue` (`total-amountPaid`) + meta phân trang. FE chuyển sang `api.getPage`.
- `GET /platform/invoices/stats`: `paidThisMonth` (Σ total PAID trong tháng), `openAmount`/`overdueAmount` (Σ còn nợ), `total`.
- **UI list KHÔNG còn nút "Tạo hóa đơn"** (khớp mock — tạo HĐ từ tenant-detail). FE InvoicesPage bỏ modal tạo; dùng Xuất CSV + markPaid.
- **Tìm theo tên trường** hiện chỉ lọc `invoiceNumber` ở server (mock placeholder "Tìm số HĐ / trường"). Muốn tìm cả tên trường cần join/subquery theo tenant → **để sau** nếu cần.
- Seed demo CHƯA tạo PlatformInvoice → trang trống sau reseed (đúng, có empty-state). Cân nhắc seed 1-2 HĐ nền tảng cho demo để trang có data.

## 5. Plans (Gói dịch vụ)  ✅ đã tích hợp (`GET /platform/plans` + `PATCH /platform/plans/:id`)

- `listPlans` thêm `tenantCount` mỗi gói = số subscription **đang chạy** (status TRIALING/ACTIVE/PAST_DUE), tính bằng `groupBy(planId)` 1 query rồi map (không N+1). Cho thẻ "X trường đang dùng".
- **`PATCH /platform/plans/:id`** (mới): sửa field vô hướng (name/description/isPublic/isActive/trialDays/sortOrder) + **upsert** prices/features/limits theo unique key (`planId_billingCycle_currency` / `planId_featureKey` / `planId_metric`). **KHÔNG** đổi `code`/`tier` (định danh gói — đổi sẽ lệch entitlement thuê bao đang chạy → FE khóa 2 field này khi sửa).
- Giá/sub-line/limit hiển thị **suy ra ở FE** từ `prices`+`tier`+`trialDays` (priceInfo/formatLimits trong PlansPage) — BE chỉ trả dữ liệu thô, không format. "Phổ biến" = tier PRO (suy ở FE, **không** có cột DB) — nếu sau muốn data-driven thì thêm `Plan.isFeatured`.
- **Chồng chéo nhẹ:** `GET /billing/plans` (public, inactive-OK) cũng trả plans+prices/features/limits cho trang signup. Khác đối tượng (tenant công khai vs platform console) → giữ riêng. **Quyết định cuối:** không gộp.
- Chưa có **xóa gói** (soft-delete `deletedAt`) qua API — mock không có nút xóa; để sau nếu cần (cần chặn xóa gói còn `tenantCount>0`).

## 6. Coupons (Mã giảm giá)  ✅ đã tích hợp (`GET /platform/coupons` + `POST /platform/coupons`)

- `listCoupons` thêm `total` vào `meta` (count cùng `where`) — nhất quán với tenants/subscriptions/invoices. UI không phân trang (bảng đơn) nên FE vẫn dùng `api.get<Coupon[]>` (lấy `data`, bỏ `meta`); có sẵn `total` cho sau này nếu thêm pager.
- **FE type cũ sai field:** `Coupon.redemptions` → đúng phải là **`redeemedCount`** (tên cột Prisma) → trước đây cột "Lượt dùng" luôn hiện 0. Đã sửa + bổ sung `durationCount/currency`. `amount` để `number | string` (Decimal serialize linh hoạt; FE `Number()` khi format).
- Hiển thị **suy ở FE** (không cần BE format): "Áp dụng" (ONCE/REPEATING+durationCount/FOREVER), "Lượt dùng" (`redeemedCount / maxRedemptions|∞`), "Hiệu lực" (hết lượt → "đã hết lượt"; có `validUntil` → "đến DATE"; còn lại → "không giới hạn").
- **Chưa có** sửa/tắt/xóa coupon qua API (mock chỉ có bảng + nút Tạo). Nếu cần "ngừng" coupon → thêm `PATCH /platform/coupons/:id { isActive }` (mirror plan). Để sau.
- **Chưa nối coupon vào luồng tính tiền** thực tế (apply mã khi tạo subscription/invoice) — `Subscription.couponId` đã có quan hệ nhưng UI/luồng redeem là P2 (xem BILLING.md). `redeemedCount` hiện luôn 0 vì chưa có điểm tăng.
- Seed **không** tạo coupon → trang trống sau reseed (đúng, có empty-state "Chưa có mã giảm giá"). cURL ledger P35 tạo 4 mã demo để xác minh UI.

## 7. Observability — Theo dõi vận hành  ✅ MỚI (`GET /platform/usage/overview` + `GET /platform/audit`)

- **Trang mới `/observability`** (không có trong mock-ui — tự thiết kế theo design-system: `kpi`/`card`/`table`/`badge`). Nav thêm nhóm "Vận hành" → "Theo dõi".
- `usage/overview` (đã có sẵn) giờ được FE dùng: 6 KPI DAU/WAU/MAU/users/tenants/active + "Top sự kiện 30 ngày" (bar).
- **`GET /platform/audit`** (mới): nhật ký hành động nhạy cảm xuyên tenant, resolve `tenantName` + `actorName/actorEmail` (batch query theo id, không N+1), lọc `action` (contains) + `tenantId`, phân trang. Cho việc **xử lý sự cố / truy vết "ai làm gì"**.
- **2 loại "log" cần phân biệt** (xem note product): (a) **audit** = ai-làm-gì → ĐÃ có (trang này); (b) **error/runtime log** = app văng chỗ nào → **CHƯA có**, hiện chỉ `Logger` ra stdout. Để "biết PH bấm nút X thì lỗi" cần tích hợp **Sentry** — P2, nên làm cùng phase build CRM/mobile.
- **Phụ thuộc phase tenant:** `dau/wau/mau` hiện chỉ đếm event `login` từ BE; app trường (CRM/mobile) chưa build nên chưa phát event tương tác. Khi build app tenant: gọi `UsageService.track(...)` ở các hành động chính để metric phản ánh tương tác thật.
- **Impersonate nâng cấp (P2):** hiện chỉ login-as **chủ trường**; muốn "thấy đúng UI của GV/PH gặp lỗi" cần cho chọn user/role cụ thể — chỉ hữu ích sau khi có UI tenant.

## Ghi chú hạ tầng test (quan trọng)

- **e2e đang chạy trên CÙNG DB dev** (`kids_api`), KHÔNG reset giữa các lần chạy → mỗi `pnpm test:e2e` tạo thêm nhiều tenant `t-*` rác, làm bẩn data demo. **Việc cần làm:** tách `DATABASE_URL` riêng cho e2e (vd `kids_api_test`) + reset trước mỗi run. Tạm thời: sau khi chạy e2e/cURL, reset+seed lại (`docker compose down -v && up` → `prisma:deploy` → `prisma:seed` + `:seed:demo`).
