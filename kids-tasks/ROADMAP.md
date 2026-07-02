# KimThanh Kids — Roadmap API

> **Chiến lược:** API-first. Hoàn tất **toàn bộ các phase API** (`kids-api`) trước, rồi mới sang **UI/UX** (kids-crm, kids-mobile-\*). Mỗi phase chỉ làm chi tiết khi tới lượt; file này là **bản đồ tổng** để không bỏ sót (đặc biệt các tính năng đã hứa trên landing).

## Tổng quan các phase

| Phase   | Tên                       | Trạng thái      | Phụ thuộc   | File chi tiết                                            |
| ------- | ------------------------- | --------------- | ----------- | -------------------------------------------------------- |
| **0**   | Nền tảng SaaS (Tầng A)    | ✅ **Xong**     | —           | (đã code: `kids-api`)                                    |
| **1**   | Domain nghiệp vụ (Tầng B) | ✅ **Xong**     | Phase 0     | [PHASE_DOMAIN_API_TASKS.md](./PHASE_DOMAIN_API_TASKS.md) |
| **2**   | Tích hợp & hạ tầng        | ◻️ Chưa         | Phase 1     | _(tạo khi tới)_                                          |
| **3**   | AI & nâng cao             | ◻️ Chưa         | Phase 1–2   | _(tạo khi tới)_                                          |
| **0.5** | Hoàn thiện billing        | ◻️ Chèn khi cần | Phase 0     | _(tạo khi tới)_                                          |
| **UI**  | kids-platform + kids-crm + mobile | 🟡 Platform ✅ · CRM ✅ · mobile-web ✅ (Vite PWA) · mobile-native 🟡 Expo scaffold/port P0 | Toàn bộ API | [PHASE_UI_TASKS.md](./PHASE_UI_TASKS.md)                 |

---

## Phase 0 — Nền tảng SaaS (Tầng A) ✅

Đa-tenant (POOL+SILO), tenant/school, white-label, gói cước, subscription, billing nền tảng (platform→trường), feature-gating, quota, RBAC 2 cấp, auth JWT, provisioning signup.
→ Tài liệu: [`../kids-documentation/`](../kids-documentation/README.md).

## Phase 1 — Domain nghiệp vụ (Tầng B) ✅

Toàn bộ luồng API trong mock-ui: students/guardians, classrooms, attendance, daily reports, health/medicine (+leave), học phí (trường→phụ huynh), announcements, menu, lesson plan, notifications, media/album, dashboard.
→ Chi tiết & ưu tiên: [PHASE_DOMAIN_API_TASKS.md](./PHASE_DOMAIN_API_TASKS.md). **Đủ để 1 trường vận hành thật.**

## Phase 2 — Tích hợp & hạ tầng ◻️

API/dịch vụ nền không thuộc 1 màn mock cụ thể, cần cho production:

- **Email giao dịch** (mời thành viên, đặt lại mật khẩu, thông báo hóa đơn) — SMTP/Resend/SES.
- **SMS / Zalo OA** (kênh phổ biến với phụ huynh VN).
- **Cổng thanh toán THẬT** VNPay/Momo (Phase 0/1 đang stub) — chữ ký, IPN, đối soát.
- **Push delivery** (FCM/Expo) + quản lý `DeviceToken`.
- **Lưu trữ file production** (R2/S3) + ảnh resize/CDN.
- **Auth nâng cao**: đặt lại mật khẩu thật, xác minh email, (tùy chọn 2FA, khóa sau N lần sai).
- **Export**: hóa đơn/báo cáo PDF, export CSV nâng cao, import học sinh hàng loạt.
- **Bật PostgreSQL RLS** (lưới an toàn cô lập tầng DB).
- **Observability**: health check, structured logging, metrics.

## Phase 3 — AI & nâng cao ◻️

- **Điểm danh AI (nhận diện khuôn mặt)** — _đã quảng bá trên landing_.
- **Gợi ý nội dung báo cáo bằng AI** — _đã quảng bá trên landing_ (Claude API).
- **Analytics nâng cao** (`@RequireFeature('analytics')`): xu hướng điểm danh, tăng trưởng, doanh thu.
- **Tuyển sinh/ghi danh** (admissions pipeline).
- **Hóa đơn VAT điện tử** (VNPT/Viettel).

> ⚠️ 2 tính năng AI là **cam kết sản phẩm trên landing** — phải có trong roadmap, không được quên.

## Phase 0.5 — Hoàn thiện billing ◻️ (chèn khi cần)

Đã bổ sung sau Phase 0: coupon admin API, impersonation platform → tenant (có audit), API xem `AuditLog`, cấu hình `PlatformConfig`, chi tiết/link công khai hóa đơn nền tảng.

Các phần còn **defer có chủ đích**: **proration** đổi gói giữa kỳ, email **dunning** (nhắc nợ T-3/T0/T+3/T+7), áp mã giảm giá vào luồng tính tiền thực tế, thu hồi/đổi public token hóa đơn.

## Phase UI/UX ◻️

API đã ổn định để UI tiêu thụ. **kids-platform** ✅ console nền tảng. **kids-crm** ✅ web quản trị trường đã nối API thật cho các module P0/P1 chính (dashboard, hồ sơ, điểm danh, báo cáo, sức khỏe, học phí, thông báo, phân công, nghỉ phép, menu, album, giáo án, notifications, pickup, audit, settings). **kids-mobile-web** ✅ React + Vite PWA: API thật + i18n VI/EN + login chọn trường qua `x-tenant`. **kids-mobile-native** 🟡 đã scaffold Expo/copy-first từ mobile-web và port P0 nhiều màn; còn cần smoke thiết bị thật, EAS/dev build, upload ảnh native và push FCM/Expo. Chọn tenant **độc lập subdomain** (dropdown `/public/tenants` + header `x-tenant`); white-label logo/màu từ `/public/branding`.

---

## Nguyên tắc xuyên suốt

- Mọi bảng domain: `tenantId` (bảo mật) + `schoolId` (nghiệp vụ); thêm vào `TENANT_KEY` của tenant extension.
- API-first: thiết kế schema/endpoint trước, UI dựng từ API.
- Mỗi module: model → migration → service (`prisma.db`) → controller (`@Roles` + school scope) → Zod DTO → e2e test cô lập.
- Tính phí/giới hạn: tích hợp `consumeQuota` + `@RequireFeature` theo gói.
