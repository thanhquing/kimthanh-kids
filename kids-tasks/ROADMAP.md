# KimThanh Kids — Roadmap API

> **Chiến lược:** API-first. Hoàn tất **toàn bộ các phase API** (`kids-api`) trước, rồi mới sang **UI/UX** (kids-crm, kids-mobile-*). Mỗi phase chỉ làm chi tiết khi tới lượt; file này là **bản đồ tổng** để không bỏ sót (đặc biệt các tính năng đã hứa trên landing).

## Tổng quan các phase

| Phase | Tên | Trạng thái | Phụ thuộc | File chi tiết |
|---|---|---|---|---|
| **0** | Nền tảng SaaS (Tầng A) | ✅ **Xong** | — | (đã code: `kids-api`) |
| **1** | Domain nghiệp vụ (Tầng B) | ⏳ Kế tiếp | Phase 0 | [PHASE_1_TASKS.md](./PHASE_1_TASKS.md) |
| **2** | Tích hợp & hạ tầng | ◻️ Chưa | Phase 1 | *(tạo khi tới)* |
| **3** | AI & nâng cao | ◻️ Chưa | Phase 1–2 | *(tạo khi tới)* |
| **0.5** | Hoàn thiện billing | ◻️ Chèn khi cần | Phase 0 | *(tạo khi tới)* |
| **UI** | kids-crm + mobile | ◻️ Sau cùng | Toàn bộ API | *(tạo khi tới)* |

---

## Phase 0 — Nền tảng SaaS (Tầng A) ✅

Đa-tenant (POOL+SILO), tenant/school, white-label, gói cước, subscription, billing nền tảng (platform→trường), feature-gating, quota, RBAC 2 cấp, auth JWT, provisioning signup.
→ Tài liệu: [`../kids-documentation/`](../kids-documentation/README.md).

## Phase 1 — Domain nghiệp vụ (Tầng B) ⏳

Toàn bộ luồng API trong mock-ui: students/guardians, classrooms, attendance, daily reports, health/medicine (+leave), học phí (trường→phụ huynh), announcements, chat, menu, lesson plan, notifications, media/album, dashboard.
→ Chi tiết & ưu tiên: [PHASE_1_TASKS.md](./PHASE_1_TASKS.md). **Đủ để 1 trường vận hành thật.**

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

- **Điểm danh AI (nhận diện khuôn mặt)** — *đã quảng bá trên landing*.
- **Gợi ý nội dung báo cáo bằng AI** — *đã quảng bá trên landing* (Claude API).
- **Analytics nâng cao** (`@RequireFeature('analytics')`): xu hướng điểm danh, tăng trưởng, doanh thu.
- **Tuyển sinh/ghi danh** (admissions pipeline).
- **Hóa đơn VAT điện tử** (VNPT/Viettel).

> ⚠️ 2 tính năng AI là **cam kết sản phẩm trên landing** — phải có trong roadmap, không được quên.

## Phase 0.5 — Hoàn thiện billing ◻️ (chèn khi cần)

Các phần đã **defer có chủ đích** ở Phase 0: **proration** đổi gói giữa kỳ, coupon admin API, email **dunning** (nhắc nợ T-3/T0/T+3/T+7), **impersonation** (platform hỗ trợ tenant, có audit), API xem `AuditLog`.

## Phase UI/UX — Sau cùng ◻️

Chỉ bắt đầu khi **toàn bộ API ổn định**: **kids-crm** (web quản trị), **kids-mobile-native**, **kids-mobile-web** — tiêu thụ API Tầng A+B, áp white-label (logo/màu từ `/public/branding`).

---

## Nguyên tắc xuyên suốt

- Mọi bảng domain: `tenantId` (bảo mật) + `schoolId` (nghiệp vụ); thêm vào `TENANT_KEY` của tenant extension.
- API-first: thiết kế schema/endpoint trước, UI dựng từ API.
- Mỗi module: model → migration → service (`prisma.db`) → controller (`@Roles` + school scope) → Zod DTO → e2e test cô lập.
- Tính phí/giới hạn: tích hợp `consumeQuota` + `@RequireFeature` theo gói.
