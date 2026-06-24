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

## 2. (thêm khi rà các trang sau: tenants / subscriptions / invoices / plans / coupons)

<!-- ghi tiếp khi tích hợp từng trang -->
