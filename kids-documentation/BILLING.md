# Gói cước & Billing nền tảng

> **Lưu ý:** Đây là billing **platform → trường** (trường trả tiền thuê dịch vụ). KHÁC với **học phí** (trường → phụ huynh) thuộc Phase 1. Mọi bảng ở đây có prefix `Platform*` / `Plan*` / `Subscription*`.

## Gói cước (seed mặc định — `prisma/seed.ts`)

> **Chiều tính gói:** theo **HS + GV + Lưu trữ**. KHÔNG tính theo số lớp (quota `CLASSROOMS` đang còn trong code sẽ được gỡ — xem [BACKLOG BL-049](../kids-tasks/BACKLOG.md)).

| code         | tier       | Giá (NET)                           | HS / GV / Lưu trữ | Tính năng bật                         |
| ------------ | ---------- | ----------------------------------- | ----------------- | ------------------------------------- |
| `free`       | FREE       | 0đ — **vĩnh viễn**                  | 10 / 1 / 500MB    | —                                     |
| `starter`    | STARTER    | 290k/th · 2.9tr/năm                 | 100 / 8 / 5GB     | media_gallery                         |
| `pro`        | PRO        | 690k/th · 1.89tr/quý · 6.9tr/năm    | 300 / 25 / 20GB   | media_gallery, lesson_plan, analytics |
| `enterprise` | ENTERPRISE | thỏa thuận                          | ∞                 | tất cả + api_access                   |
| `dedicated`  | CUSTOM     | thỏa thuận (ẩn)                     | ∞                 | tất cả; deploy riêng                  |

> **Freemium:** `POST /public/signup` luôn gắn gói **`free` ở trạng thái ACTIVE vĩnh viễn** (`trialEndsAt=null`, `currentPeriodEnd ≈ +100 năm`) — **không qua TRIAL**. Tất cả gói seed hiện đặt `trialDays=0`; state `TRIALING` + cron `expireTrials` chỉ kích hoạt nếu cấu hình gói có `trialDays>0`.
> **Signup trả phí:** landing có thể gửi `planCode` + `billingCycle`. Backend vẫn tạo tenant Free ACTIVE trước, sau đó tạo `PlatformInvoice` OPEN metadata `{ type: "SIGNUP_UPGRADE", targetPlanId, targetPlanCode, targetBillingCycle }`. Chỉ khi platform admin bấm **Đã thu** thì subscription mới nâng sang gói đã chọn.
> **Feature key:** `media_gallery` (Album, **enforced** Starter+), `lesson_plan` (Giáo án, **enforced** Pro+), `analytics` (báo cáo nâng cao — **Coming Soon**, cờ khai báo nhưng chưa enforce/chưa xây), `api_access` (**Coming Soon**, chưa enforce). Cờ `messaging` (Chat GV–PH) là **Coming Soon** — có cờ seed nhưng chưa có module; bảng giá chỉ hiển thị badge "Sắp có", không bán như đã có.
> **Quota PARENT:** không đếm bằng counter mà **giới hạn theo `STUDENTS`** (1 học sinh ~ 1 phụ huynh đại diện).

Mô hình giá **linh hoạt**: `PlanPrice` (theo chu kỳ × tiền tệ) + `PlanFeature` (bật/tắt tính năng) + `PlanLimit` (quota theo metric). Đổi giá/feature/limit không cần đổi schema.

### Cơ sở định giá (chi phí thực tế + thuế + đối thủ, cập nhật 2026-07-10)

Giá seed là **giá NET (chưa gồm VAT)**. Nguồn tham chiếu thực tế:

- **Đối thủ VN (giá/HS/tháng):** OneKids 1.000–25.000đ · KidsOnline 30.000đ · MISA EMIS 20.000–30.000đ · PMS từ 10.000đ · GoKids ~15.000đ · LittleLives 2–5 USD. Thị trường tính **theo đầu học sinh**, gói trả phí phổ biến **10.000–30.000đ/HS/tháng**.
- **Định vị của mình (định giá THÂM NHẬP — sản phẩm mới, phải rẻ hơn để cạnh tranh):** giữ mô hình **giá trọn gói theo bậc + cap theo GV/HS** (chi phí dự đoán được = điểm bán), giá thấp + nhiều chức năng = giá trị cảm nhận cao. Quy đổi:
  - Starter 290k @ 40–100 HS ≈ **2.900–7.250đ/HS** · Pro 690k @ 100–300 HS ≈ **2.300–6.900đ/HS** → **rẻ hơn hẳn** OneKids/KidsOnline/MISA (10–30k/HS) mà biên gộp ~90%.
- **Hạ tầng VN (VPS):** 4vCPU/8GB NVMe ~386k–790k/tháng. Kiến trúc **multi-tenant chung 1 cụm** → chi phí biên/tenant chỉ ~vài chục nghìn đ/tháng (chủ yếu là lưu trữ ảnh + phí cổng thanh toán ~1–2%). Chi phí cố định nền tảng giai đoạn đầu (app VPS + Postgres + R2/S3 + email + domain/monitoring/backup) ≈ **2–2.5tr/tháng**, phục vụ tới hàng trăm tenant trước khi cần scale.
- **Điểm hòa vốn hạ tầng:** ~**8–9 tenant Starter** (hoặc ~4 Pro) là đủ bù chi phí cố định 2–2.5tr/tháng; lời thực phụ thuộc chi phí hỗ trợ/CS + marketing (CAC). Giá thâm nhập thấp đổi lấy thị phần sớm; có thể nâng bậc/giá về sau qua cơ chế versioning ([BL-050](../kids-tasks/BACKLOG.md)) mà không ảnh hưởng khách cũ.
- **Thuế (áp dụng, cần kế toán chốt):**
  - **GTGT:** theo Luật GTGT 48/2024 + NĐ 181/2025 (hiệu lực 01/7/2025), "sản phẩm/dịch vụ phần mềm" có thể **không chịu GTGT**; nhưng SaaS truy cập theo kỳ thường bị xem là **dịch vụ chịu 10%**. Đây là **vùng xám** → giá lưu NET, VAT xử lý ở khâu xuất hóa đơn. GTGT là **pass-through**, không ảnh hưởng biên lời.
  - **TNDN:** chuẩn **20%** trên lợi nhuận; DN sản xuất phần mềm có thể được **ưu đãi 10%/miễn 4 năm/giảm 50% 9 năm** — cần xác nhận điều kiện.
- **Blocked input (business):** cách áp VAT trên `PlatformInvoice` (0%/8%/10%) và pháp nhân xuất hóa đơn — do kế toán/PO chốt trước khi phát hành hóa đơn thật.

## State machine Subscription

```mermaid
stateDiagram-v2
  [*] --> TRIALING: signup (trialDays>0)
  [*] --> ACTIVE: signup (trả ngay / DEDICATED_FREE)
  TRIALING --> ACTIVE: thanh toán (TRIAL_CONVERT)
  TRIALING --> EXPIRED: trial hết, chưa trả (cron expireTrials)
  ACTIVE --> ACTIVE: gia hạn kỳ (RENEW)
  ACTIVE --> PAST_DUE: hóa đơn quá hạn (cron markOverdue)
  PAST_DUE --> ACTIVE: thanh toán
  PAST_DUE --> SUSPENDED: quá grace 7 ngày (cron dunningSuspend)
  SUSPENDED --> ACTIVE: thanh toán (REACTIVATE)
  SUSPENDED --> CANCELED: quá grace 14 ngày (cron dunningCancel)
  ACTIVE --> CANCELED: hủy ngay
  ACTIVE --> ACTIVE: cancelAtPeriodEnd=true (hủy cuối kỳ)
  CANCELED --> [*]
  EXPIRED --> [*]
```

`Tenant.status` (cache) ánh xạ: TRIALING→TRIAL, ACTIVE→ACTIVE, PAST_DUE→PAST_DUE, SUSPENDED→SUSPENDED, CANCELED/EXPIRED→CANCELLED. Cập nhật bởi [`LifecycleService`](../kids-api/src/billing/lifecycle.service.ts).

## SubscriptionGuard — enforce theo trạng thái

| Trạng thái             | Hành vi                                                                   |
| ---------------------- | ------------------------------------------------------------------------- |
| `TRIALING` / `ACTIVE`  | Full quyền                                                                |
| `PAST_DUE`             | Full + header `X-Subscription-Status: PAST_DUE` (chỉ nhắc nợ, KHÔNG khóa) |
| `SUSPENDED`            | Chỉ đọc (GET) hoặc route `@AllowInactive` (billing)                       |
| `CANCELED` / `EXPIRED` | Chặn, trừ `@AllowInactive` (auth + billing self-service)                  |

## Feature-gating & Quota

- **Feature-gating:** `@RequireFeature('lesson_plan')`, `@RequireFeature('media_gallery')` trên route → `SubscriptionGuard` chặn nếu gói không bật (đây là 2 feature ĐƯỢC enforce). Cờ `analytics`/`api_access` đã seed nhưng chưa có endpoint gate (**Coming Soon**). Cờ `messaging` (Chat GV–PH) là **Coming Soon** — chưa có module, chỉ hiển thị badge "Sắp có" ở bảng giá.
- **Quota:** `EntitlementService.consumeQuota(tenantId, metric)` tăng nguyên tử `UsageCounter` (UPDATE … WHERE value ≤ limit-delta). HARD vượt → `403 QUOTA_EXCEEDED`; SOFT cho vượt + ghi overage. `releaseQuota` khi xóa thực thể. Phase 1 gọi trong transaction tạo Student/Classroom...
- **Cảnh báo nâng gói:** `GET /platform/worklist` trả KPI `quota` (atRisk = số dòng >=80% / `tenants` = số trường distinct) cho tenant ACTIVE/TRIAL/PAST_DUE, tính trực tiếp từ Student/Membership(GV)/Classroom/Media (KHÔNG tính SCHOOLS — gói 1 cơ sở luôn 100%; không qua `UsageCounter` cache). Danh sách trường + cột "Hạn mức" (used/limit 4 metric) ở `GET /platform/tenants?quota=at-risk` (bấm KPI để mở) → operator chủ động tư vấn nâng gói trước khi tenant bị chặn.
- **Entitlements** = `Plan.features/limits` + override `TenantEntitlement` (cho dedicated nâng riêng). Cache ở `Subscription.entitlementsCache`.

## Hóa đơn & Thanh toán

- `BillingService.createPeriodInvoice(tenantId)` → `PlatformInvoice` OPEN từ `PlanPrice`; số hóa đơn dạng **`{SLUG}-{MÃ_GÓI}-{YYYYMMDD}-{NN}`** (vd `DEMO-PRO-20260625-01`) để dùng làm `addInfo` VietQR và đối soát thủ công.
- `BillingService.createSignupUpgradeInvoice(tenantId, planCode, billingCycle)` → hóa đơn nâng cấp sau signup. Trường dùng Free ngay; HĐ public token cho landing/success page dựng VietQR với `addInfo=invoiceNumber`. Gói không có giá VND public (>0) trả `NO_PUBLIC_PRICE` để chuyển sang tư vấn.
- `BillingService.markInvoicePaid(...)`:
  - HĐ thường: đánh dấu PAID, reactivate subscription và đẩy kỳ hiện tại như trước.
  - HĐ `SIGNUP_UPGRADE`: cập nhật `Subscription.planId/billingCycle`, set kỳ mới từ thời điểm thu tiền, clear `entitlementsCache`, `LifecycleService.syncTenantCache`, ghi `SubscriptionChange.UPGRADE`.
- Thanh toán gateway MVP: `PaymentService.createPayment` hiện chỉ nhận `provider="VNPAY"` → `PlatformPayment` PENDING + `redirectUrl` VNPay theo env (`VNPAY_PAY_URL` + `VNPAY_RETURN_URL`). Webhook `POST /platform/webhooks/vnpay` → verify chữ ký (HMAC-SHA512), **dedupe** theo `(provider,eventId)`, **idempotent** theo `(provider,gatewayRef)` → invoice PAID → reactivate + đẩy kỳ. Provider khác trả `UNSUPPORTED_PROVIDER` cho tới khi có verifier riêng.
- **Hardening chữ ký webhook (áp cho cả platform billing lẫn học phí `POST /tuition/webhooks/vnpay`):** verifier fail-closed — thiếu `VNPAY_HASH_SECRET` ở production → luôn từ chối; provider ≠ VNPAY bị chặn ngay ở route (`UNSUPPORTED_PROVIDER`). Ở dev/test khi chưa cấu hình secret thì bỏ qua verify cho tiện. VNPay **không có default URL/secret trong code**: deploy không dùng VNPay có thể để trống; khi gọi flow VNPay mà thiếu `VNPAY_PAY_URL` hoặc `VNPAY_RETURN_URL` sẽ trả `VNPAY_NOT_CONFIGURED`. Nếu production có cấu hình bất kỳ biến VNPay nào thì `config.schema` bắt đủ secret + URL, và fail-fast nếu `VNPAY_PAY_URL` còn trỏ `sandbox`.
- `billingMode`: `GATEWAY` (tự trả) · `MANUAL` (đối soát chuyển khoản) · `DEDICATED_FREE` (không thu qua gateway).
- MVP VietQR hiện **đối soát thủ công** trong Platform Console; chưa có auto đối soát ngân hàng/Casso/SePay.

## Cron jobs ([`BillingJobsService`](../kids-api/src/billing/billing-jobs.service.ts))

| Job                   | Lịch      | Việc                                  |
| --------------------- | --------- | ------------------------------------- |
| `expireTrials`        | hằng giờ  | TRIALING & hết trial → EXPIRED        |
| `markOverdueInvoices` | hằng ngày | OPEN quá hạn → OVERDUE + sub PAST_DUE |
| `dunningSuspend`      | hằng ngày | PAST_DUE > 7 ngày → SUSPENDED         |
| `dunningCancel`       | hằng ngày | SUSPENDED > 14 ngày → CANCELED        |

Logic tách khỏi `BillingCron` để test gọi trực tiếp (deterministic, truyền `now`). Mọi job idempotent + chạy `prisma.system`.

## Điểm defer cho MVP (xem plan)

- **Proration** đổi gói giữa kỳ: hiện chuyển gói ngay, áp giá mới từ kỳ kế (chưa tính proration theo ngày).
- **Auto-charge** token thẻ: tenant chủ động trả mỗi kỳ + nhắc (VNPay/Momo VN khó token hóa).
- **Hóa đơn VAT điện tử**: giữ field `tax` + line `TAX`, tích hợp sau.
