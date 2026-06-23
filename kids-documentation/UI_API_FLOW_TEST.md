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

## CRM Chu Truong

Mock UI source (`kids-landing/public/mock-ui/web/`):

- `login.html`, `dashboard.html`
- `classrooms.html`, `classroom-detail.html`
- `students.html`, `student-profile.html`
- `attendance.html`, `reports.html`
- `medicine-requests.html`, `health-records.html`, `incidents.html`
- `invoices.html`, `invoice-print.html`, `payments.html`
- `announcements.html`, `assignments.html`
- `users.html`, `settings-school.html`, `audit-log.html`

Run: `1782232197`.
Fixture tenant: `crm1782232197.kimthanhkids.vn` (tao moi qua public signup, goi `free`).
Tai khoan: `owner@crm1782232197.edu.vn` / `Password123` (SCHOOL_ADMIN tu signup).
Temp response dir: `/tmp/kids-crm-flow-1782232197`.

Luong nguoi dung: chu truong dang nhap -> cau hinh truong -> tao nhan su/lop/hoc sinh -> diem danh, bao cao, suc khoe, su co -> hoc phi/thanh toan -> truyen thong -> phan cong -> kiem toan.

| ID | UI behavior | cURL/API | Expected | Actual | Result | Signal |
|---|---|---|---:|---:|---|---|
| C00 | Dang ky truong moi (provisioning) | `POST /public/signup` | `201` | `201` | PASS | tenant + admin created |
| C01 | Chu truong dang nhap CRM | `POST /auth/login` | `201` | `201` | PASS | token issued |
| C02 | Lay profile dang nhap | `GET /auth/me` | `200` | `200` | PASS | user returned |
| C03 | Mo trang cai dat truong | `GET /tenant/settings` | `200` | `200` | PASS | settings returned |
| C04 | Luu branding + tai khoan ngan hang | `PATCH /tenant/settings` | `200` | `200` | PASS | updated |
| C05 | Danh sach co so/truong | `GET /tenant/schools` | `200` | `200` | PASS | school returned |
| C06 | Dashboard tong quan | `GET /dashboard/summary` | `200` | `200` | PASS | summary returned |
| C07 | Tao tai khoan giao vien | `POST /tenant/members` | `201` | `201` | PASS | teacher created |
| C08 | Danh sach thanh vien | `GET /tenant/members` | `200` | `200` | PASS | items returned |
| C09 | Tao lop hoc (gan GVCN) | `POST /classrooms` | `201` | `201` | PASS | classroom created |
| C10 | Danh sach lop | `GET /classrooms` | `200` | `200` | PASS | items returned |
| C11 | Chi tiet lop | `GET /classrooms/:id` | `200` | `200` | PASS | classroom returned |
| C12 | Cap nhat si so lop | `PATCH /classrooms/:id` | `200` | `200` | PASS | updated |
| C13 | Tao ho so hoc sinh | `POST /students` | `201` | `201` | PASS | student created |
| C14 | Danh sach hoc sinh theo lop | `GET /students?classroomId=` | `200` | `200` | PASS | items returned |
| C15 | Mo ho so hoc sinh | `GET /students/:id` | `200` | `200` | PASS | student returned |
| C16 | Tao tai khoan phu huynh | `POST /tenant/members` | `201` | `201` | PASS | parent created |
| C17 | Lien ket phu huynh - hoc sinh | `POST /students/:id/guardians` | `201` | `201` | PASS | guardian linked |
| C18 | Diem danh ca lop | `POST /attendance/mark` | `201` | `201` | PASS | attendance saved |
| C19 | Xem bang diem danh | `GET /attendance?classroomId=&date=` | `200` | `200` | PASS | items returned |
| C20 | Ghi so lien lac/bao cao ngay | `POST /daily-reports` | `201` | `201` | PASS | report upserted |
| C21 | Xem bao cao ngay theo lop | `GET /daily-reports?classroomId=&date=` | `200` | `200` | PASS | items returned |
| C22 | Phu huynh/GV gui yeu cau cap thuoc | `POST /medicine` | `201` | `201` | PASS | request created |
| C23 | Danh sach yeu cau thuoc | `GET /medicine` | `200` | `200` | PASS | items returned |
| C24 | Y ta/quan ly duyet thuoc | `POST /medicine/:id/handle` | `201` | `201` | PASS | status updated |
| C25 | Ghi chi so suc khoe | `POST /health` | `201` | `201` | PASS | record created |
| C26 | Xem lich su suc khoe HS | `GET /health/student/:id` | `200` | `200` | PASS | items returned |
| C27 | Ghi nhan di ung | `POST /allergies` | `201` | `201` | PASS | allergy created |
| C28 | Danh sach di ung HS | `GET /allergies/student/:id` | `200` | `200` | PASS | items returned |
| C29 | Bao cao su co | `POST /incidents` | `201` | `201` | PASS | incident created |
| C30 | Danh sach su co | `GET /incidents` | `200` | `200` | PASS | items returned |
| C31 | Tao hoa don hoc phi | `POST /tuition/invoices` | `201` | `201` | PASS | invoice created |
| C32 | Danh sach hoa don | `GET /tuition/invoices` | `200` | `200` | PASS | items returned |
| C33 | Chi tiet hoa don | `GET /tuition/invoices/:id` | `200` | `200` | PASS | invoice returned |
| C34 | Lay ma VietQR de thu | `GET /tuition/invoices/:id/vietqr` | `200` | `200` | PASS | qr payload returned |
| C35 | Ghi nhan thu tien mat | `POST /tuition/invoices/:id/pay/manual` | `201` | `201` | PASS | payment recorded |
| C36 | In hoa don (HTML) | `GET /tuition/invoices/:id/print` | `200` | `200` | PASS | html returned |
| C37 | Xuat CSV hoa don | `GET /tuition/invoices/export` | `200` | `200` | PASS | csv returned |
| C38 | Soan thong bao | `POST /announcements` | `201` | `201` | PASS | announcement created (field `body`) |
| C39 | Phat hanh thong bao | `POST /announcements/:id/publish` | `201` | `201` | PASS | published |
| C40 | Xem feed thong bao | `GET /announcements/feed` | `200` | `200` | PASS | items returned |
| C41 | Tao lich phan cong truc | `POST /assignments` | `201` | `201` | PASS | assignment created |
| C42 | Danh sach phan cong | `GET /assignments` | `200` | `200` | PASS | items returned |
| C43 | Xem nhat ky kiem toan | `GET /audit-logs` | `200` | `200` | PASS | items returned |
| CE01 | Edge: thieu token | `GET /tenant/settings` | `401` | `401` | PASS | `UNAUTHORIZED` |
| CE02 | Edge: phu huynh tao lop (cam) | `POST /classrooms` | `403` | `403` | PASS | `FORBIDDEN` |
| CE03 | Edge: tao HS thieu field bat buoc | `POST /students` | `400` | `400` | PASS | validation error |
| CE04 | Edge: lop thu 2 trong han muc (free=2) | `POST /classrooms` | `201` | `201` | PASS | within quota |
| CE04b | Edge: lop thu 3 vuot han muc (free=2) | `POST /classrooms` | `403` | `403` | PASS | quota enforced |

Fix da thuc hien trong qua trinh test (deu o phia script test, **khong sua backend**):

- `POST /announcements` dung field `body` (xac nhan lai phat hien cu cua Codex: contract la `body`, khong phai `content`).
- Response API boc trong `{ success, data }` (TransformInterceptor) -> script phai boc `data` truoc khi lay `accessToken`/`id`.
- VietQR (`GET /tuition/invoices/:id/vietqr`) tra `400 NO_BANK_CONFIG` neu chua cau hinh ngan hang -> dung hanh vi; bo sung `bankBin/bankAccountNumber/bankAccountName` o `PATCH /tenant/settings` (C04) truoc khi goi.
- Han muc lop goi `free` = 2 (HARD): lop thu 2 van `201`, lop thu 3 moi `403` -> chinh lai expectation cua edge case.

Ket qua: **49/49 PASS**, khong con case fail. Backend CRM chu truong khop 100% voi mock UI.

## Dang Do

App nho/mobile theo role giao vien va phu huynh (`mock-ui/mobile/`) chua chay. Day la buoc tiep theo: dang nhap mobile theo role TEACHER/PARENT -> cac man feed (bao cao ngay, diem danh, thong bao, hoa don, suc khoe...) tuong ung quyen doc/ghi gioi han.
