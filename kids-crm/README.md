# kids-crm

Web quản trị (CRM/dashboard) cho nhà trường & nhân viên KimThanh Kids.

> Đã bootstrap bằng copy-first từ `kids-platform`: app shell, đăng nhập realm tenant (login/me/refresh + guard chặn tài khoản platform) và **placeholder routes** cho toàn bộ module P0/P1. Phần tích hợp business API (dashboard, settings, …) **chưa làm** — sẽ wiring từng màn theo Quy trình bắt buộc; tầng `src/api/http.ts` đã sẵn để ráp lại nhanh.

## Dự kiến
- Giao diện quản lý: học sinh, lớp học, điểm danh, hóa đơn/học phí, thông báo, báo cáo
- Kết nối tới `kids-api`

## Roadmap

Theo dõi checklist triển khai ở [`../kids-tasks/PHASE_CRM_TASKS.md`](../kids-tasks/PHASE_CRM_TASKS.md).

## Bắt đầu

```bash
pnpm install
pnpm dev
```

Dev mặc định proxy API sang `http://localhost:3000` và gắn `Host: demo.kimthanhkids.vn`.
Demo login (đăng nhập bằng **số điện thoại**): admin `0909000001` / `Password123` (identifier vẫn chấp nhận email `admin@hoasen.edu.vn`).
