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

## 8. Worklist — Cần hành động (bảo vệ doanh thu)  ✅ MỚI (`GET /platform/worklist`)

- **Trang mới `/worklist`** (nav nhóm "Doanh thu" → "Cần hành động"). Gộp 3 nguồn rò rỉ/cơ hội doanh thu để operator **chủ động xử lý**.
- **Phễu dùng thử:** TRIALING đang chạy + sắp hết hạn (≤7 ngày) + tỷ lệ chuyển đổi (`converted/endedTotal`, converted = trial kết thúc KHÔNG thành EXPIRED). **Lưu ý mô hình:** signup mặc định FREE/ACTIVE (freemium, `trialEndsAt=null`) → trial chỉ phát sinh khi nâng gói trả phí có `trialDays`; demo trống là đúng.
- **Sắp chạm quota (chỉ KPI ở worklist):** tenant ACTIVE/TRIAL/PAST_DUE dùng >=80% limit hữu hạn `STUDENTS/TEACHERS/CLASSROOMS/STORAGE_MB` — **KHÔNG tính SCHOOLS** (gói 1 cơ sở luôn 1/1=100% → mọi trường đều "at-risk", nhiễu; mỗi cơ sở = 1 tenant). Worklist trả 2 KPI bấm-được (`atRisk` = số dòng / `tenants` = số trường) cho NHẸ; **danh sách + cột "Hạn mức"** (used/limit 4 metric) ở trang Trường qua filter `GET /platform/tenants?quota=at-risk` (helper `quotaLines`/`usageCounts`/`resolveLimitMap` dùng chung, usage thật, không qua `UsageCounter` cache). Đã bỏ mức critical >=90% — chỉ cần >=80%.
- **Công nợ:** hóa đơn `OPEN/OVERDUE` quá hạn (dueAt < now, còn nợ) — query theo **ngày + còn nợ**, KHÔNG phụ thuộc cron `markOverdueInvoices` đã chạy hay chưa → thấy ngay. Resolve `tenantName` (PlatformInvoice không có quan hệ tenant) + `subStatus` (batch). Nút "Đã thu" dùng lại `markPaid`.
- **KHÔNG trùng** với dashboard (`overview` chỉ đếm overdue + KPI tổng quan, không có quota-risk theo tenant/metric) — worklist rộng hơn (gồm OPEN-quá-hạn + KPI quota-risk) + có item công nợ để hành động. Giữ cả 2.
- **Engine đã có sẵn** (`billing-jobs`: expireTrials/markOverdueInvoices/dunningSuspend/dunningCancel trên cron) — trang này chỉ là **lớp hiển thị**, không lặp logic.
- **P2 (cần kênh email):** nhắc tự động tới chủ trường ở các mốc dunning (chỉ thêm 1 `mail.send` mỗi job). Hiện chưa có email service → nhắc thủ công qua trang này.

## 10. Polish đợt sau (số HĐ / filter / search / confirm / mobile)  ✅

- **Số HĐ nền tảng đổi định dạng:** `PINV-{year}-{seq}` → **`{SLUG}-{MÃ_GÓI}-{YYYYMMDD}-{NN}`** (vd `DEMO-PRO-20260625-01`). Sinh ở `billing.service.nextInvoiceNumber(slug, planCode, issuedAt)`; createPeriodInvoice include thêm `tenant`. Không test nào assert format cũ → an toàn. **seed-demo** tạo HĐ nền tảng cho `demo` và các tenant platform case (`saomai/bupmang/rangdong/tuoitho/banmai`) để trang Hóa đơn/Cần hành động có data quota/công nợ/gói sau reseed. Cleanup demo idempotent: xóa `platformPayment/creditLedger/platformInvoice` trước `subscription` (FK).
- **Trường thuê — lọc theo Gói:** `listTenants` thêm `planTier?` (filter qua `subscription.plan.tier`); FE dropdown "Tất cả gói" cạnh search.
- **Tổng quan — tìm nhanh:** `GET /platform/search?q=` (top 5 trường + 5 HĐ, resolve tenantName). FE QuickSearch (debounce 300ms, dropdown) → click trường `/tenants/:id`, click HĐ `/invoices?q=` (InvoicesPage đọc `q` từ URL).
- **Hóa đơn — confirm "đã thu":** thêm Modal xác nhận trước `markPaid` (số HĐ + trường + tiền + hệ quả). (Worklist vẫn markPaid trực tiếp — cân nhắc thêm confirm tương tự nếu cần.)
- **Mobile:** bọc bảng `overflow-x-auto` cho Tenants/Subscriptions/Invoices/Coupons (Worklist/Observability đã có) → bảng cuộn ngang trong khung, không đẩy rộng trang.

## 11. Đồng bộ chéo trang + fix markPaid  ✅

- **Cache chéo trang (react-query):** mutation ảnh hưởng nhiều trang trước đây chỉ invalidate cục bộ (markPaid ở Hóa đơn chỉ `["invoices"]`, ở Cần hành động chỉ `["worklist"]`) → trang khác hiển thị số CŨ tới khi tự refetch. Thêm helper **`invalidatePlatformData(qc)`** (`src/lib/queries.ts`) invalidate cả nhóm `platform-overview/revenue · tenants · subscriptions · invoices · worklist · quick-search`. Gọi sau: markPaid (Hóa đơn + Cần hành động + Tenant-detail), suspend/reactivate/createInvoice/override (Tenant-detail), createTenant, **create/updatePlan** (đổi giá gói → MRR đổi khắp nơi). Đã verify: bấm "Đã thu" ở Cần hành động → sang Hóa đơn thấy PAID ngay (không reload).
- **Fix `markInvoicePaid`:** "Đánh dấu đã thu" thủ công không truyền số tiền → trước đây set `amountPaid=0` ⇒ hóa đơn PAID nhưng `amountDue` vẫn = total (mâu thuẫn). Sửa: không truyền amount = **trả đủ** (`amountPaid = total`). Có truyền amount thì dùng đúng số (hỗ trợ trả 1 phần sau).
- **"Quá hạn" cron-independent (3 nơi khớp nhau):** chuyển định nghĩa quá hạn từ **status `OVERDUE`** (chờ cron `markOverdue`) sang **theo NGÀY** (chưa trả + `dueAt<now`) ở: `dashboard` (overview overdueInvoices/recentOverdue), `listInvoices` (chip OPEN=mọi chưa trả, OVERDUE=quá hạn theo ngày), `invoiceStats` (openAmount/overdueAmount). FE thêm `invoiceDisplayStatus()` → badge HĐ chưa-trả-quá-hạn hiện "Quá hạn" dù status DB còn OPEN. Worklist vốn đã theo ngày → giờ Tổng quan / Hóa đơn / Cần hành động **nhất quán** không phụ thuộc cron.

## 12. Trang chi tiết hóa đơn + link công khai + in + VietQR  ✅ MỚI

- **QR rời khỏi Cài đặt:** Settings chỉ lưu **tài khoản ngân hàng** (bin/số TK/tên TK). VietQR sinh ở **ngữ cảnh hóa đơn** (mới có số HĐ + số tiền thật) — không preview ở Settings nữa.
- **Schema:** `PlatformInvoice.publicToken` (uuid `@unique @default(uuid())`) — migration backfill hàng cũ bằng `gen_random_uuid()`. seed.ts set sẵn TK ngân hàng demo (VCB) cho PlatformConfig để QR hiện; seed-demo có 2 HĐ → có token.
- **BE:** `GET /platform/invoices/:id` (admin, đặt sau route tĩnh) + `GET /public/platform-invoices/:token` (`@Public`, controller riêng `PublicInvoiceController`, **bỏ id/publicToken** khi trả). Shaping chung `shapeInvoiceDoc` (bên bán nền tảng cố định + bên mua=trường + ngân hàng từ config).
- **FE:** component `InvoiceDocument` (layout in A4 theo mẫu phiếu) + `lib/vietqr.ts` (BANKS + `vietQrUrl`) + `lib/numToWords.ts` (đọc số ra chữ "Bằng chữ"). Trang `/invoices/:id` (admin: In `window.print()` + Chia sẻ copy link + QR) & `/hoa-don/:token` (công khai, ngoài RequireAuth, không sidebar). Print qua `@media print` (chỉ in `.print-area`, ẩn `.no-print`). Số HĐ ở list → link sang chi tiết; QuickSearch dashboard click HĐ → chi tiết.
- **P2:** thu hồi/đổi token (revoke link), tải PDF server (puppeteer), nhúng QR offline (không phụ thuộc img.vietqr.io khi in mất mạng), logo/thông tin bên bán đưa vào config thay vì hardcode.

## 9. Settings — Cài đặt nền tảng + VietQR  ✅ MỚI (`GET/PATCH /platform/settings`)

- **Model mới `PlatformConfig`** (singleton id="singleton") — KHÁC `TenantSettings` (mỗi trường). Lưu **TK ngân hàng nền tảng** (VietQR tenant→platform) + **grace dunning**. Module riêng `platform-config/` để cả `platform` lẫn `billing` dùng chung, **tránh circular** (billing đã được platform import).
- **VietQR = MIỄN PHÍ** qua `img.vietqr.io/image/{BIN}-{STK}-compact2.png?amount=&addInfo={số HĐ}` (chỉ là URL ảnh, không key/hợp đồng). `addInfo = số hóa đơn` → đối soát **thủ công** (xem biến động NH → bấm markPaid). **Đối soát tự động = P2** (SePay/Casso webhook → tự markPaid); đã chuẩn hóa addInfo nên lên auto nhẹ.
- **Grace dunning chuyển ENV → DB:** `billing-jobs` (dunningSuspend/dunningCancel) giờ đọc `PlatformConfigService.graceDays()`; ENV `PAST_DUE_GRACE_DAYS`/`SUSPENDED_GRACE_DAYS` chỉ là **giá trị khởi tạo** khi tạo singleton. Test cũ vẫn xanh (default 7/14 không đổi). `expireTrials` không dùng grace.
- **PATCH chỉ `PLATFORM_SUPER_ADMIN`** (TK ngân hàng + grace là cấu hình nhạy cảm); GET cho cả SUPER_ADMIN/BILLING.
- **P2:** chọn VietQR template (compact/qr-only), nhiều TK ngân hàng, thương hiệu nền tảng (logo/email), webhook SePay.

## Ghi chú hạ tầng test (quan trọng)

- **e2e đang chạy trên CÙNG DB dev** (`kids_api`), KHÔNG reset giữa các lần chạy → mỗi `pnpm test:e2e` tạo thêm nhiều tenant `t-*` rác, làm bẩn data demo. **Việc cần làm:** tách `DATABASE_URL` riêng cho e2e (vd `kids_api_test`) + reset trước mỗi run. Tạm thời: sau khi chạy e2e/cURL, reset+seed lại (`docker compose down -v && up` → `prisma:deploy` → `prisma:seed` + `:seed:demo`).
