# kids-crm

Web quản trị (CRM/dashboard) cho nhà trường & nhân viên KimThanh Kids.

> Đã bootstrap bằng copy-first từ `kids-platform` và hiện đã nối API thật cho toàn bộ nhóm module P0/P1 chính: dashboard, lớp/học sinh/nhân sự, điểm danh, báo cáo ngày, sức khỏe/thuốc/sự cố/dị ứng, học phí/VietQR/thu tiền/in/hủy, thông báo, phân công, đơn nghỉ, thực đơn, album/upload, giáo án, notifications, pickup, audit và settings. Login chọn trường bằng `/public/tenants` + header `x-tenant`, hỗ trợ VI/EN và refresh token.

## Phạm vi đã có

- App shell tenant realm, auth guard, sidebar/bottom nav responsive, i18n VI/EN.
- CRUD/vận hành chính qua `src/api/crm.ts` và TanStack Query.
- Các route chính: `/classrooms`, `/students`, `/members`, `/attendance`, `/reports`, `/health`, `/leave`, `/tuition`, `/announcements`, `/assignments`, `/menus`, `/albums`, `/lessons`, `/notifications`, `/pickup`, `/audit-logs`, `/settings`.
- Còn cần smoke test dev đầy đủ với Docker/Postgres local, visual regression theo mock và E2E FE nếu chuẩn bị release.

## Roadmap

Theo dõi checklist triển khai ở [`../kids-tasks/PHASE_CRM_TASKS.md`](../kids-tasks/PHASE_CRM_TASKS.md).

## Bắt đầu

```bash
pnpm install
pnpm gen:api
pnpm dev
pnpm build
```

Dev mặc định proxy API sang `http://localhost:3000`; tenant được chọn ở login và gửi qua `x-tenant`, không cần ghim Host tenant trong proxy.
Demo login (đăng nhập bằng **số điện thoại**): admin `0909000001` / `Password123` (identifier vẫn chấp nhận email `admin@hoasen.edu.vn`).
