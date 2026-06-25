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
| P18 | Dashboard tong quan (KPI+MRR+phan bo+2 list) | `GET /platform/overview` | `200` | `200` | PASS | kpis{tenants,active,trial,overdue,suspended,mrr} + mrrSeries[12] + mrrGrowthPct |
| P19 | Doanh thu MRR 12 thang | `GET /platform/revenue?months=12` | `200` | `200` | PASS | series 12 diem |
| P20 | Doanh thu MRR 24 thang | `GET /platform/revenue?months=24` | `200` | `200` | PASS | series 24, source CRON/BACKFILL/DERIVED; cap <=24 |
| P21 | Backfill snapshot MRR | `POST /platform/mrr/backfill?months=24` | `201` | `201` | PASS | `{ok,written}`; chi ghi thang con thieu |
| P22 | Dem tenant theo trang thai (chip) | `GET /platform/tenants/stats` | `200` | `200` | PASS | `{total,ACTIVE,TRIAL,PAST_DUE,SUSPENDED}` |
| P23 | Tim truong server-side | `GET /platform/tenants?q=demo` | `200` | `200` | PASS | loc theo slug/legalName/displayName |
| P24 | Chi tiet truong giau truong | `GET /platform/tenants/:id` | `200` | `200` | PASS | demo: mrr 1.200.000, studentCount 12, quota[STUDENTS 12/300,TEACHERS 2/25,CLASSROOMS 3/20,STORAGE_MB 0/20480], schools[]._count |
| M01 | Signup MST sai checksum | `POST /public/signup` (taxCode `1234567890`) | `400` | `400` | PASS | `VALIDATION_FAILED` |
| M02 | Signup MST trung (1 MST=1 truong) | `POST /public/signup` (taxCode da dung) | `409` | `409` | PASS | `TAX_CODE_TAKEN` |
| M03 | Signup MST hop le | `POST /public/signup` (taxCode dung checksum) | `201` | `201` | PASS | tenant + admin created |
| E04 | Edge: tenant admin xem doanh thu | `GET /platform/revenue` | `403` | `403` | PASS | `FORBIDDEN` |
| E05 | Edge: tenant admin backfill | `POST /platform/mrr/backfill` | `403` | `403` | PASS | `FORBIDDEN` (chi SUPER_ADMIN) |
| E06 | Edge: tenant admin xem stats | `GET /platform/tenants/stats` | `403` | `403` | PASS | `FORBIDDEN` |
| P25 | KPI thue bao theo trang thai | `GET /platform/subscriptions/stats` | `200` | `200` | PASS | `{total,TRIALING,ACTIVE,PAST_DUE,SUSPENDED,CANCELED,EXPIRED}` |
| P26 | List thue bao giau truong | `GET /platform/subscriptions?page=1` | `200` | `200` | PASS | moi dong kem `tenantName,billingCycle,autoRenew,mrr`; demo Hoa Sen PRO/MONTHLY mrr 1.200.000 |
| P27 | Loc thue bao theo trang thai | `GET /platform/subscriptions?status=ACTIVE` | `200` | `200` | PASS | chi tra ACTIVE |
| E07 | Edge: tenant admin xem stats thue bao | `GET /platform/subscriptions/stats` | `403` | `403` | PASS | `FORBIDDEN` |
| P28 | KPI tien hoa don nen tang | `GET /platform/invoices/stats` | `200` | `200` | PASS | `{paidThisMonth,openAmount,overdueAmount,total}`; demo chờ thu 1.200.000 |
| P29 | List hoa don giau truong | `GET /platform/invoices?page=1` | `200` | `200` | PASS | moi dong kem `tenantName,period,dueDate,amountDue`; demo PINV-2026-000001 |
| P30 | Loc hoa don theo trang thai | `GET /platform/invoices?status=OPEN` | `200` | `200` | PASS | chi tra OPEN |
| P31 | Tim hoa don theo so HD | `GET /platform/invoices?q=PINV` | `200` | `200` | PASS | loc theo invoiceNumber |
| E08 | Edge: tenant admin xem stats hoa don | `GET /platform/invoices/stats` | `403` | `403` | PASS | `FORBIDDEN` |
| P32 | List goi + tenantCount/gia/limit | `GET /platform/plans` | `200` | `200` | PASS | moi goi kem `tenantCount,prices,features,limits,trialDays`; demo PRO tenantCount=1 |
| P33 | Sua goi (desc/trialDays/upsert gia) | `PATCH /platform/plans/:id` | `200` | `200` | PASS | trialDays=14, MONTHLY 1.300.000 → khoi phuc 1.200.000 |
| P34 | Sua goi khong ton tai | `PATCH /platform/plans/<uuid-0>` | `404` | `404` | PASS | `PLAN_NOT_FOUND` |
| E09 | Edge: tenant admin sua goi | `PATCH /platform/plans/:id` | `403` | `403` | PASS | `FORBIDDEN` |
| E01 | Edge: thieu token | `GET /platform/tenants` | `401` | `401` | PASS | `UNAUTHORIZED` |
| E02A | Fixture: tenant admin login | `POST /auth/login` | `201` | `201` | PASS | token issued |
| E02 | Edge: tenant admin goi platform route | `GET /platform/tenants` | `403` | `403` | PASS | `FORBIDDEN` |
| E03 | Edge: tenant id khong ton tai | `GET /platform/tenants/00000000-0000-0000-0000-000000000000` | `404` | `404` | PASS | `NO_TENANT` |

Fix da thuc hien trong qua trinh test:

- Them `POST /platform/tenants` de platform console tao tenant bang cung luong provisioning voi public signup.
- Them `POST /platform/tenants/:id/impersonate` cho `PLATFORM_SUPER_ADMIN`; token khong co refresh token va co audit log `platform.tenant.impersonate`.
- Them `GET /platform/coupons` va `POST /platform/coupons` vi schema da co `Coupon` va mock UI co trang coupon.
- Dong bo `kids-documentation/API.md` cho cac endpoint tren.

Bo sung dot 2 (dashboard/tenants/MST — run sau khi reset DB sach, tenant demo PRO):

- `GET /platform/overview` (dashboard giau du lieu) + `GET /platform/revenue` + `POST /platform/mrr/backfill` (snapshot MRR theo thang, cron dau thang) — P18..P21.
- `GET /platform/tenants/stats` (chip dem theo trang thai) + `?q=` (search server-side) + detail tra them `mrr/studentCount/quota/schools._count` — P22..P24.
- Signup **bat buoc MST** (`Tenant.taxCode` unique + checksum Tong cuc Thue): M01 sai checksum 400, M02 trung 409 `TAX_CODE_TAKEN`, M03 hop le 201.
- Edge phan quyen endpoint moi (chi `PLATFORM_SUPER_ADMIN/BILLING`): E04..E06 → 403.
- Tat ca da co e2e tuong ung (`test/observability.e2e-spec.ts`, `test/auth-rbac.e2e-spec.ts`).

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

## App Nho / Mobile (Giao vien + Phu huynh)

Mock UI source (`kids-landing/public/mock-ui/mobile/`):

- Chung: `login.html`, `splash.html`, `profile.html`, `notifications.html`
- Giao vien: `home-teacher.html`, `class-roster.html`, `attendance-mark.html`, `attendance-history.html`, `report-compose.html`, `report-feed.html`, `medicine-list.html`, `medicine-approve.html`, `menu-weekly.html`, `announcement-compose.html`, `announcements-feed.html`, `album-gallery.html`, `lesson-plan.html`
- Phu huynh: `home-parent.html`, `children-list.html`, `student-detail.html`, `attendance-history.html`, `report-feed.html`, `medicine-create.html`, `medicine-detail.html`, `invoices.html`, `payment-checkout.html`, `leave-request.html`, `menu-weekly.html`

Run: `1782233245`.
Fixture tenant: `mob1782233245.kimthanhkids.vn` (platform tao tenant + bat feature `media_gallery` & `lesson_plan` qua entitlement override).
Tai khoan: `teacher@mob1782233245.edu.vn` (GV), `parent@mob1782233245.edu.vn` (PH), mat khau `Password123`.
Temp dir: `/tmp/kids-mobile-flow-1782233245`.

Luong: platform tao tenant + cap feature -> admin dung fixture (GV, PH, lop, HS, gan PH, thuc don, hoa don) -> GV thao tac app -> PH thao tac app -> GV duyet yeu cau cua PH.

### Setup (platform + admin)

| ID | Behavior | cURL/API | Expected | Actual | Result |
|---|---|---|---:|---:|---|
| S01 | Platform tao tenant cho app | `POST /platform/tenants` | `201` | `201` | PASS |
| S02 | Bat feature media_gallery | `POST /platform/tenants/:id/entitlements` | `201` | `201` | PASS |
| S03 | Bat feature lesson_plan | `POST /platform/tenants/:id/entitlements` | `201` | `201` | PASS |
| S04 | Admin tao giao vien | `POST /tenant/members` | `201` | `201` | PASS |
| S05 | Admin tao phu huynh | `POST /tenant/members` | `201` | `201` | PASS |
| S06 | Admin tao lop (gan GVCN) | `POST /classrooms` | `201` | `201` | PASS |
| S07 | Admin tao hoc sinh | `POST /students` | `201` | `201` | PASS |
| S08 | Admin gan phu huynh - HS | `POST /students/:id/guardians` | `201` | `201` | PASS |
| S09 | Admin tao thuc don tuan | `POST /menus` | `201` | `201` | PASS |
| S10 | Admin tao hoa don cho PH | `POST /tuition/invoices` | `201` | `201` | PASS |

### Giao vien (home-teacher)

| ID | UI behavior | cURL/API | Expected | Actual | Result |
|---|---|---|---:|---:|---|
| TC01 | GV xem profile | `GET /auth/me` | `200` | `200` | PASS |
| TC02 | GV home: phan cong cua toi | `GET /assignments/mine` | `200` | `200` | PASS |
| TC03 | GV danh sach lop | `GET /classrooms` | `200` | `200` | PASS |
| TC04 | class-roster: HS trong lop | `GET /students?classroomId=` | `200` | `200` | PASS |
| TC05 | attendance-mark: diem danh | `POST /attendance/mark` | `201` | `201` | PASS |
| TC06 | attendance-history | `GET /attendance?classroomId=&date=` | `200` | `200` | PASS |
| TC07 | report-compose: so lien lac | `POST /daily-reports` | `201` | `201` | PASS |
| TC08 | report-feed theo lop | `GET /daily-reports?classroomId=&date=` | `200` | `200` | PASS |
| TC09 | menu-weekly: xem thuc don | `GET /menus?weekStart=` | `200` | `200` | PASS |
| TC10 | announcement-compose: thong bao lop | `POST /announcements` | `201` | `201` | PASS |
| TC11 | announcements-feed | `GET /announcements/feed` | `200` | `200` | PASS |
| TC12 | notifications | `GET /notifications` | `200` | `200` | PASS |
| TC13 | dem chua doc | `GET /notifications/unread-count` | `200` | `200` | PASS |
| TC14 | upload anh lop | `POST /media?kind=ALBUM` | `201` | `201` | PASS |
| TC15 | tao album | `POST /albums` | `201` | `201` | PASS |
| TC16 | them anh vao album | `POST /albums/:id/photos` | `201` | `201` | PASS |
| TC17 | album-gallery: danh sach album | `GET /albums` | `200` | `200` | PASS |
| TC18 | lesson-plan: tao ke hoach | `POST /lesson-plans` | `201` | `201` | PASS |
| TC19 | xem lesson-plan | `GET /lesson-plans?classroomId=` | `200` | `200` | PASS |

### Phu huynh (home-parent)

| ID | UI behavior | cURL/API | Expected | Actual | Result |
|---|---|---|---:|---:|---|
| PR01 | PH xem profile | `GET /auth/me` | `200` | `200` | PASS |
| PR02 | children-list: con cua toi | `GET /students/mine` | `200` | `200` | PASS |
| PR03 | attendance-history cua con | `GET /attendance/student/:id` | `200` | `200` | PASS |
| PR04 | report-feed cua con | `GET /daily-reports/student/:id` | `200` | `200` | PASS |
| PR05 | student-detail: suc khoe con | `GET /health/student/:id` | `200` | `200` | PASS |
| PR06 | medicine-create: gui cap thuoc | `POST /medicine` | `201` | `201` | PASS |
| PR07 | medicine-list cua minh | `GET /medicine/mine` | `200` | `200` | PASS |
| PR08 | medicine-detail | `GET /medicine/:id` | `200` | `200` | PASS |
| PR09 | invoices cua minh | `GET /tuition/invoices/mine` | `200` | `200` | PASS |
| PR10 | chi tiet hoa don | `GET /tuition/invoices/:id` | `200` | `200` | PASS |
| PR11 | lay VietQR | `GET /tuition/invoices/:id/vietqr` | `200` | `200` | PASS |
| PR12 | payment-checkout (VNPAY) | `POST /tuition/invoices/:id/pay/gateway` | `201` | `201` | PASS |
| PR13 | leave-request: xin nghi | `POST /leave` | `201` | `201` | PASS |
| PR14 | xem don nghi cua minh | `GET /leave/mine` | `200` | `200` | PASS |
| PR15 | announcements-feed | `GET /announcements/feed` | `200` | `200` | PASS |
| PR16 | menu-weekly | `GET /menus?weekStart=` | `200` | `200` | PASS |
| PR17 | album-gallery (viewer) | `GET /albums` | `200` | `200` | PASS |
| PR18 | notifications | `GET /notifications` | `200` | `200` | PASS |
| PR19 | danh dau da doc tat ca | `POST /notifications/read-all` | `201` | `201` | PASS |

### Cross-role + Edge

| ID | Behavior | cURL/API | Expected | Actual | Result |
|---|---|---|---:|---:|---|
| XC01 | GV duyet yeu cau thuoc cua PH | `POST /medicine/:id/handle` | `201` | `201` | PASS |
| XC02 | GV duyet don nghi cua PH | `POST /leave/:id/decide` | `201` | `201` | PASS |
| ME01 | Edge: PH goi list HS (staff-only) | `GET /students` | `403` | `403` | PASS |
| ME02 | Edge: PH diem danh (cam) | `POST /attendance/mark` | `403` | `403` | PASS |
| ME03 | Edge: GV xem audit-log (admin-only) | `GET /audit-logs` | `403` | `403` | PASS |
| ME04 | Edge: PH tu duyet don nghi (cam) | `POST /leave/:id/decide` | `403` | `403` | PASS |
| ME05 | Edge: thieu token | `GET /notifications` | `401` | `401` | PASS |

Ghi chu: feature `media_gallery` (album) va `lesson_plan` khong co trong goi `free`, phai bat qua entitlement override (S02/S03) -> dung thiet ke gating. Upload anh dung multipart `POST /media` (sharp -> webp) roi gan `mediaId` vao album. `pay/gateway` tra `redirectUrl` VNPay sandbox, khong can cau hinh rieng.

Ket qua: **55/55 PASS**, khong sua backend.

## Hoan Tat

Ca 3 vung da chay het bang cURL thuc te tren DB Docker, **khong con case fail**:

- Platform tenant: 23/23 PASS (co fix backend: create tenant / impersonate / coupons).
- CRM chu truong: 49/49 PASS (backend giu nguyen).
- App nho/mobile (GV + PH): 55/55 PASS (backend giu nguyen).

Tong: 127 case PASS. Backend khop voi toan bo mock UI cho ca 3 platform/role -> san sang integrate UI thuc.
