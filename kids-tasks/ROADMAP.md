# KimThanh Kids — Roadmap tổng

> Cập nhật: 2026-07-11. Phase 0 SaaS + Phase 1 domain đã đóng (176 e2e / 20 suite); các app FE chính đã nối API thật. Consent pháp lý (BL-046), gỡ quota lớp (BL-049), versioning gói (BL-050) đã xong. Việc còn lại được gom ở [BACKLOG.md](./BACKLOG.md), kiến thức DONE ở [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md).

## Tổng quan

| Phase | Tên | Trạng thái | Nguồn chi tiết |
| --- | --- | --- | --- |
| 0 | Nền tảng SaaS | DONE | [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md) |
| 1 | Domain nghiệp vụ A->G | DONE | [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md) |
| UI | Platform + CRM + mobile-web + mobile-native | Platform/CRM/mobile-web DONE; native cần smoke/EAS | [BACKLOG.md](./BACKLOG.md) |
| L | Landing self-service | MVP DONE | [IMPLEMENTATION_KNOWLEDGE.md](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md) |
| 2 | Tích hợp & hạ tầng production | Backlog | [BACKLOG.md](./BACKLOG.md) |
| 3 | AI & nâng cao | Backlog | [BACKLOG.md](./BACKLOG.md) |

## Đã đóng

- Phase 0: multi-tenant, tenant/school, white-label, plan/subscription/billing nền tảng, feature-gating, quota, RBAC 2 cấp, auth.
- Phase 1: students/guardians, classrooms, attendance, daily reports, health/medicine/incident/allergy/leave, tuition, announcements, menu, lesson plan, notifications, media/album, dashboard/audit/usage.
- Platform: console vận hành Kim Thanh, invoice/public token, worklist, observability, posts CMS.
- CRM: module vận hành trường P0/P1 và các mở rộng album/lesson/pickup/notifications.
- Mobile-web: PWA PH/GV dùng API thật, i18n VI/EN, login chọn trường qua `x-tenant`.
- Landing: pricing API thật, signup Free ACTIVE, paid signup tạo invoice nâng gói + VietQR, public invoice, blog dynamic.

## Còn lại

Xem [BACKLOG.md](./BACKLOG.md), đã sắp theo thứ tự dễ -> phức tạp:

1. Smoke/dev setup và error mapping.
2. Kiểm thử release.
3. Mobile native device/EAS.
4. Vận hành SaaS gần production.
5. File/media/privacy.
6. Push, thanh toán, đối soát.
7. Sản phẩm nâng cao.

## Nguyên tắc xuyên suốt

- Mọi bảng domain: `tenantId` + `schoolId`; thêm vào `TENANT_KEY`.
- API-first: schema/endpoint là hợp đồng, FE tiêu thụ qua `src/api/http.ts`.
- Module backend: model -> migration -> service (`prisma.db`) -> controller (`@Roles` + scope) -> Zod DTO -> e2e.
- Tính phí/giới hạn: `consumeQuota` + `@RequireFeature`.
- Không quảng bá tính năng chưa có: Chat GV–PH là **Coming Soon** (có cờ seed, chưa có module — chỉ hiện badge "Sắp có", không bán như đã có); push, auto đối soát, MoMo/ZaloPay production, analytics nâng cao, app store release đều là backlog.
