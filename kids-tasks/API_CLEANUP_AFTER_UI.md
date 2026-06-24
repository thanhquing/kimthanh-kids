# API cleanup sau khi tích hợp UI (kids-platform)

> File tạm — gom các điểm API **dư thừa / chồng chéo** lộ ra khi nối UI mới (match mock-ui 100%) với backend.
> KHÔNG xử lý ngay; rà & dọn 1 lượt ở cuối khi UI các trang đã ổn định, tránh xoá nhầm thứ còn dùng.

## 1. Dashboard  ✅ đã tích hợp (endpoint `GET /platform/overview`)

### 1.1. `GET /platform/usage/overview` (UsageService.overview) — trùng một phần với `/platform/overview` mới

- **Hiện trạng:** Trả `tenants, activeTenants, users, dau, wau, mau, topEvents`.
- **Sau tích hợp:** Dashboard mới dùng `GET /platform/overview` (KPI trial/overdue/suspended/MRR + phân bổ gói + 2 list). FE **không còn dùng** `dau/wau/mau/users/topEvents`.
- **Chồng chéo:** cả 2 endpoint đều `count` `tenants` + `activeTenants`.
- **Quyết định cần chốt cuối:**
  - [ ] `usage/overview` vẫn cần cho mục **Observability** (DAU/WAU/MAU) hay gộp luôn vào `/platform/overview`?
  - Ràng buộc: `test/observability.e2e-spec.ts` đang test `usage/overview` (tồn tại + 403 cho non-platform) → nếu bỏ phải sửa test.
  - Hiện **giữ nguyên** `usage/overview` (chưa có UI Observability), chỉ ghi nhận trùng lặp.

### 1.2. FE type `Overview` cũ (kids-platform/src/api/platform.ts) — field thừa

- Sau khi repoint `platform.overview()` sang `/platform/overview`, các field `users/dau/wau/mau/topEvents` trong type cũ **không còn nơi dùng**.
- **Việc cuối:** xoá type `Overview` cũ nếu không endpoint nào khác trả shape đó.

## 2. Tenants  ✅ đã tích hợp

- `listTenants` trả thêm `planTier/billingCycle/studentCount/mrr` + meta phân trang; `GET /platform/tenants/stats` cho chip; `?q=` search server-side.
- FE `api.getPage` (trả `{items,meta}`) — list khác giờ nên migrate dần sang dạng này.

## 3. Subscriptions  ✅ đã tích hợp (`GET /platform/subscriptions` + `/subscriptions/stats`)

- `listSubscriptions` đổi trả về: thêm `tenantName/tenantSlug/mrr/autoRenew` mỗi dòng + **meta phân trang** (trước chỉ `{page,pageSize}`, thiếu `total`). FE chuyển `api.get`→`api.getPage`.
- **`autoRenew` là field DẪN XUẤT** (`!cancelAtPeriodEnd`), KHÔNG có cột thật trong DB — nếu sau này cần "tắt auto-renew" thì set `Subscription.cancelAtPeriodEnd=true` (đã có cột). FE type `Subscription.autoRenew` cũ từng dùng nhưng BE chưa trả → nay BE trả đúng.
- `GET /platform/subscriptions/stats` (đếm theo trạng thái) — **chồng chéo nhẹ** với `tenants/stats` (cùng ý nghĩa active/trial/pastdue/suspended vì 1 tenant = 1 subscription). Giữ riêng vì ngữ nghĩa khác (thuê bao vs trường) + có thêm CANCELED/EXPIRED. **Quyết định cuối:** cân nhắc gộp 1 endpoint `platform/stats` trả cả 2 nhóm nếu trùng nhiều.
- KPI "Đã hủy/hết hạn" = `CANCELED + EXPIRED` (gộp ở FE).

## 4. (thêm khi rà tiếp: invoices / plans / coupons)

<!-- ghi tiếp khi tích hợp từng trang -->

## Ghi chú hạ tầng test (quan trọng)

- **e2e đang chạy trên CÙNG DB dev** (`kids_api`), KHÔNG reset giữa các lần chạy → mỗi `pnpm test:e2e` tạo thêm nhiều tenant `t-*` rác, làm bẩn data demo. **Việc cần làm:** tách `DATABASE_URL` riêng cho e2e (vd `kids_api_test`) + reset trước mỗi run. Tạm thời: sau khi chạy e2e/cURL, reset+seed lại (`docker compose down -v && up` → `prisma:deploy` → `prisma:seed` + `:seed:demo`).
