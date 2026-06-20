# Gói cước & Billing nền tảng

> **Lưu ý:** Đây là billing **platform → trường** (trường trả tiền thuê dịch vụ). KHÁC với **học phí** (trường → phụ huynh) thuộc Phase 1. Mọi bảng ở đây có prefix `Platform*` / `Plan*` / `Subscription*`.

## Gói cước (seed mặc định)

| code | tier | Giá | Trial | Đặc điểm |
|---|---|---|---|---|
| `starter` | STARTER | 0đ/tháng | 30 ngày | messaging; limit STUDENTS 50, CLASSROOMS 5 |
| `pro` | PRO | 1.2tr/th · 3.24tr/quý · 12.24tr/năm | — | +media_gallery, lesson_plan, analytics; STUDENTS 500 |
| `enterprise` | ENTERPRISE | thỏa thuận | — | tất cả tính năng; quota unlimited (chuỗi nhiều cơ sở) |
| `dedicated` | CUSTOM | thỏa thuận (ẩn) | — | deploy riêng (SILO); `billingMode=DEDICATED_FREE` |

Mô hình giá **linh hoạt**: `PlanPrice` (theo chu kỳ × tiền tệ) + `PlanFeature` (bật/tắt tính năng) + `PlanLimit` (quota theo metric). Đổi giá/feature/limit không cần đổi schema.

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

| Trạng thái | Hành vi |
|---|---|
| `TRIALING` / `ACTIVE` | Full quyền |
| `PAST_DUE` | Full + header `X-Subscription-Status: PAST_DUE` (chỉ nhắc nợ, KHÔNG khóa) |
| `SUSPENDED` | Chỉ đọc (GET) hoặc route `@AllowInactive` (billing) |
| `CANCELED` / `EXPIRED` | Chặn, trừ `@AllowInactive` (auth + billing self-service) |

## Feature-gating & Quota

- **Feature-gating:** `@RequireFeature('messaging')` trên route → `SubscriptionGuard` chặn nếu gói không bật.
- **Quota:** `EntitlementService.consumeQuota(tenantId, metric)` tăng nguyên tử `UsageCounter` (UPDATE … WHERE value ≤ limit-delta). HARD vượt → `403 QUOTA_EXCEEDED`; SOFT cho vượt + ghi overage. `releaseQuota` khi xóa thực thể. Phase 1 gọi trong transaction tạo Student/Classroom...
- **Entitlements** = `Plan.features/limits` + override `TenantEntitlement` (cho dedicated nâng riêng). Cache ở `Subscription.entitlementsCache`.

## Hóa đơn & Thanh toán

- `BillingService.createPeriodInvoice(tenantId)` → `PlatformInvoice` OPEN từ `PlanPrice` (số `PINV-YYYY-NNNNNN`).
- Thanh toán: `PaymentService.createPayment` → `PlatformPayment` PENDING + `redirectUrl` (VNPay). Webhook `POST /platform/webhooks/:provider` → verify chữ ký (HMAC-SHA512), **dedupe** theo `(provider,eventId)`, **idempotent** theo `(provider,gatewayRef)` → invoice PAID → reactivate + đẩy kỳ.
- `billingMode`: `GATEWAY` (tự trả) · `MANUAL` (đối soát chuyển khoản) · `DEDICATED_FREE` (không thu qua gateway).

## Cron jobs ([`BillingJobsService`](../kids-api/src/billing/billing-jobs.service.ts))

| Job | Lịch | Việc |
|---|---|---|
| `expireTrials` | hằng giờ | TRIALING & hết trial → EXPIRED |
| `markOverdueInvoices` | hằng ngày | OPEN quá hạn → OVERDUE + sub PAST_DUE |
| `dunningSuspend` | hằng ngày | PAST_DUE > 7 ngày → SUSPENDED |
| `dunningCancel` | hằng ngày | SUSPENDED > 14 ngày → CANCELED |

Logic tách khỏi `BillingCron` để test gọi trực tiếp (deterministic, truyền `now`). Mọi job idempotent + chạy `prisma.system`.

## Điểm defer cho MVP (xem plan)

- **Proration** đổi gói giữa kỳ: hiện chuyển gói ngay, áp giá mới từ kỳ kế (chưa tính proration theo ngày).
- **Auto-charge** token thẻ: tenant chủ động trả mỗi kỳ + nhắc (VNPay/Momo VN khó token hóa).
- **Hóa đơn VAT điện tử**: giữ field `tax` + line `TAX`, tích hợp sau.
