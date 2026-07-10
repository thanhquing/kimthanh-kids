# KimThanh Kids — Tài liệu Nghiệp vụ & Đào tạo

> Tài liệu cho **người dùng doanh nghiệp**: CEO, Product Owner, chủ trường, đội đào tạo, nhân viên Sale.
> **Tài liệu kỹ thuật** (dev/AI) nằm ở thư mục [`kids-documentation/`](../kids-documentation) — không trùng với folder này.
> Cập nhật: 2026-06.

| #   | Tài liệu                                       | Đối tượng                 | Đọc để                                                         |
| --- | ---------------------------------------------- | ------------------------- | -------------------------------------------------------------- |
| 01  | [Business Flows](01-BUSINESS-FLOWS.md)         | CEO · PO · chủ trường     | Hiểu sản phẩm làm gì, hành trình người dùng, góp ý flow        |
| 02  | [Roles & Permissions](02-ROLES-PERMISSIONS.md) | PO · đào tạo · onboarding | Từng vai trò làm được gì, thao tác ra sao, ma trận quyền       |
| 03  | [Sales Playbook](03-SALES-PLAYBOOK.md)         | Nhân viên Sale            | Kịch bản nói chuyện khách (học thuộc), bảng giá, xử lý từ chối |
| 04  | [SEO Content Playbook](seo-content/SEO-CONTENT-PLAYBOOK.md) | Marketing · CEO · AI agent | Cách chọn topic, viết bài SEO/AI Overview và phân phối đa kênh |
| 05  | [Data 20 bài SEO B2B SaaS](seo-content/2026-B2B-SAAS-BLOG-DATA-20-POSTS.md) | Marketing · Content · Sale | Backlog 20 bài SEO có keyword, outline, CTA, ảnh và schema     |

## Tài liệu kỹ thuật liên quan (ở `kids-documentation/`)

- [ARCHITECTURE.md](../kids-documentation/ARCHITECTURE.md) — kiến trúc + module domain Phase 1 (A→G) + conventions.
- [API.md](../kids-documentation/API.md) — danh mục endpoint đầy đủ (Tầng A + Phase 1).
- [DATABASE_ERD.md](../kids-documentation/DATABASE_ERD.md) · [BILLING.md](../kids-documentation/BILLING.md) · [MULTI_TENANCY.md](../kids-documentation/MULTI_TENANCY.md) — dữ liệu, gói cước, đa-tenant.

## Nguồn sự thật

- Code API: [`kids-api/`](../kids-api).
- Kế hoạch & tiến độ: [`kids-tasks/BACKLOG.md`](../kids-tasks/BACKLOG.md).
- Kiến thức phần đã làm xong: [`kids-documentation/IMPLEMENTATION_KNOWLEDGE.md`](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md).
- Mockup UI tham chiếu: [`kids-landing/public/mock-ui/`](../kids-landing/public/mock-ui).

## Lưu ý nhất quán (đọc trước khi quảng bá/triển khai)

Các phần **chưa làm / thuộc giai đoạn sau** (đừng cam kết với khách):

- **Chat GV–PH** — **Coming Soon** (hiển thị badge "Sắp có" ở bảng giá, chưa có module; không bán như đã có).
- **Push notification FCM** — làm cùng phase mobile.
- **Tự động đối soát ngân hàng cho VietQR**, **cổng MoMo/ZaloPay**, **analytics nâng cao**, **reset mật khẩu qua email** — P2.
- **App iOS/Android store release** — native đã code nhiều màn, còn smoke/EAS/store readiness trong backlog.
