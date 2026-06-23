# UI API Flow Test Ledger

Muc tieu: lay mock UI lam nguon hanh vi nguoi dung, chuyen thanh thu tu call API thuc te, chay bang cURL vao `kids-api` local + PostgreSQL Docker, va chi ghi cac case da pass. Neu mot flow fail trong qua trinh chay, sua code/docs/test support tai cho, rerun den khi pass roi moi ghi vao ledger.

Thu tu audit:

1. Platform tenant.
2. CRM chu truong.
3. App nho/mobile theo role giao vien/phu huynh.

Moi run dung:

```bash
source "$HOME/.nvm/nvm.sh"
nvm use 22
cd kids-api
pnpm start:dev
```

Base URL: `http://localhost:3000/api`.
Platform host: `admin.kimthanhkids.vn`.
Tenant host duoc tao rieng theo tung cURL run de khong dung tenant `demo`.

## Platform Tenant

Mock UI source:

- `kids-landing/public/mock-ui/platform/login.html`
- `kids-landing/public/mock-ui/platform/dashboard.html`
- `kids-landing/public/mock-ui/platform/tenants.html`
- `kids-landing/public/mock-ui/platform/tenant-detail.html`
- `kids-landing/public/mock-ui/platform/subscriptions.html`
- `kids-landing/public/mock-ui/platform/invoices.html`
- `kids-landing/public/mock-ui/platform/plans.html`
- `kids-landing/public/mock-ui/platform/coupons.html`

Run: `1782229351`.
Fixture tenant: `pf-curl-1782229351.kimthanhkids.vn`.
Temp response dir: `/tmp/kids-platform-flow-1782229351`.

| ID | UI behavior | cURL/API | Expected | Actual | Result | Signal |
|---|---|---|---:|---:|---|---|
| F01 | Dang nhap platform console | `POST /auth/login` | `201` | `201` | PASS | token issued |
| P00 | Tao truong tu platform tenant list | `POST /platform/tenants` | `201` | `201` | PASS | tenant `15fd11c4-6edb-46ee-a82f-42e64c940abd` |
| P01 | Xem KPI tong quan platform | `GET /platform/usage/overview` | `200` | `200` | PASS | ok |
| P02 | Xem danh sach truong thue | `GET /platform/tenants?page=1` | `200` | `200` | PASS | items returned |
| P03 | Mo chi tiet truong | `GET /platform/tenants/:id` | `200` | `200` | PASS | tenant detail returned |
| P04 | Impersonate vao CRM truong | `POST /platform/tenants/:id/impersonate` | `201` | `201` | PASS | access token issued |
| P05 | Verify token impersonate tren tenant host | `GET /tenant/settings` | `200` | `200` | PASS | tenant settings returned |
| P06 | Xem danh sach subscription | `GET /platform/subscriptions?page=1` | `200` | `200` | PASS | items returned |
| P07 | Xem hoa don nen tang | `GET /platform/invoices?page=1` | `200` | `200` | PASS | items returned |
| P08 | Xem danh sach goi dich vu | `GET /platform/plans` | `200` | `200` | PASS | items returned |
| P09 | Tao goi dich vu | `POST /platform/plans` | `201` | `201` | PASS | plan created |
| P10 | Tao ma giam gia | `POST /platform/coupons` | `201` | `201` | PASS | coupon created |
| P11 | Xem danh sach ma giam gia active | `GET /platform/coupons?isActive=true&page=1` | `200` | `200` | PASS | items returned |
| P12 | Override han muc tenant | `POST /platform/tenants/:id/entitlements` | `201` | `201` | PASS | entitlement created |
| P13 | Tao hoa don ky moi | `POST /platform/invoices` | `201` | `201` | PASS | invoice created |
| P14 | Danh dau hoa don da thu | `POST /platform/invoices/:id/mark-paid` | `201` | `201` | PASS | invoice paid |
| P15 | Tam khoa truong | `POST /platform/tenants/:id/suspend` | `201` | `201` | PASS | ok |
| P16 | Verify chi tiet sau suspend | `GET /platform/tenants/:id` | `200` | `200` | PASS | tenant detail returned |
| P17 | Mo khoa lai tenant test | `POST /platform/tenants/:id/reactivate` | `201` | `201` | PASS | ok |
| E01 | Edge: thieu token | `GET /platform/tenants` | `401` | `401` | PASS | `UNAUTHORIZED` |
| E02A | Fixture: tenant admin login | `POST /auth/login` | `201` | `201` | PASS | token issued |
| E02 | Edge: tenant admin goi platform route | `GET /platform/tenants` | `403` | `403` | PASS | `FORBIDDEN` |
| E03 | Edge: tenant id khong ton tai | `GET /platform/tenants/00000000-0000-0000-0000-000000000000` | `404` | `404` | PASS | `NO_TENANT` |

Fix da thuc hien trong qua trinh test:

- Them `POST /platform/tenants` de platform console tao tenant bang cung luong provisioning voi public signup.
- Them `POST /platform/tenants/:id/impersonate` cho `PLATFORM_SUPER_ADMIN`; token khong co refresh token va co audit log `platform.tenant.impersonate`.
- Them `GET /platform/coupons` va `POST /platform/coupons` vi schema da co `Coupon` va mock UI co trang coupon.
- Dong bo `kids-documentation/API.md` cho cac endpoint tren.

## Dang Do

CRM chu truong da bat dau chay cURL nhung chua duoc ghi vao bang pass vi rerun cuoi bi dung boi gioi han approval/tool khi can goi HTTP localhost vao API + Docker DB.

Trang thai truoc khi dung:

- Da tao script CRM owner cover cac man `web/dashboard`, `web/classrooms`, `web/students`, `web/attendance`, `web/reports`, `web/medicine-requests`, `web/health-records`, `web/incidents`, `web/invoices`, `web/payments`, `web/announcements`, `web/users`, `web/assignments`, `web/settings-school`, `web/audit-log`.
- Luot dau dung tai `POST /announcements` do payload test dung sai field `content`; API contract dung la `body`.
- Da xac nhan day la loi script mapping mock UI, khong phai loi backend.
- Can rerun CRM script voi `AnnouncementCreate.body`, neu pass moi append vao ledger.
