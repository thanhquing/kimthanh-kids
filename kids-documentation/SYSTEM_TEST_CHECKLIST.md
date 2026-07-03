# System Test & Stress Test Checklist — KimThanh Kids

Checklist này dùng để lập kế hoạch kiểm tra chịu tải, độ bền, chất lượng vận hành và các nhóm test bắt buộc khác cho hệ thống SaaS multi-tenant KimThanh Kids.

Tài liệu nền cần đọc trước khi test:

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MULTI_TENANCY.md](./MULTI_TENANCY.md)
- [DATABASE_ERD.md](./DATABASE_ERD.md)
- [API.md](./API.md)
- [BILLING.md](./BILLING.md)
- [SECURITY_AUDIT_CHECKLIST.md](./SECURITY_AUDIT_CHECKLIST.md)

## Mục Tiêu

- Biết hệ thống chịu được bao nhiêu tenant, bao nhiêu user đồng thời, bao nhiêu request/giây trước khi chậm hoặc lỗi.
- Xác định điểm nghẽn: API, Prisma/PostgreSQL, connection pool, media processing, webhook, cron, FE bundle/cache.
- Kiểm tra tenant isolation vẫn đúng khi chạy tải cao, không rò dữ liệu chéo tenant khi request đồng thời.
- Xác nhận các luồng nghiệp vụ quan trọng vẫn ổn định: login, điểm danh, báo cáo ngày, upload ảnh, thông báo, học phí, billing, dashboard.
- Tạo bằng chứng đo lường để quyết định tối ưu code, index DB, cache, queue, scale hạ tầng.

## Cách Dùng

- Mỗi đợt test cần ghi rõ môi trường, commit hash, dữ liệu seed, cấu hình máy, cấu hình DB và công cụ test.
- Không chạy stress test trực tiếp trên production nếu chưa có cửa sổ bảo trì và rollback plan.
- Với test có ghi dữ liệu, dùng tenant/demo riêng và có script cleanup.
- Mọi kết quả cần có số liệu: RPS, latency p50/p95/p99, error rate, CPU/RAM, DB connections, query slow, dung lượng storage, log lỗi.
- Nếu phát hiện bottleneck, tạo issue riêng kèm cách tái hiện, biểu đồ hoặc log.

| Trạng thái | Ý nghĩa |
| --- | --- |
| `TODO` | Chưa kiểm tra |
| `DOING` | Đang kiểm tra |
| `PASS` | Đạt tiêu chí |
| `FAIL` | Không đạt, cần fix/tối ưu |
| `N/A` | Không áp dụng, ghi lý do |

## Workflow Cho AI Agent

1. Đọc tài liệu nền và file này trước khi sinh script test.
2. Inventory endpoint theo nhóm: public/auth/tenant/platform/domain/media/webhook/dashboard.
3. Chọn bộ test nhỏ trước: smoke load 1 tenant, sau đó mở rộng multi-tenant và stress.
4. Không chỉ đo `200 OK`; phải kiểm tra response đúng tenant, đúng role, đúng dữ liệu.
5. Khi tạo script load test, tách config: base URL, tenant slug, token, số user, duration, ramp-up, output report.
6. Không hard-code secret thật hoặc token thật vào repo.
7. Sau khi chạy test, tổng hợp bottleneck và đề xuất fix theo thứ tự: correctness trước, index/query sau, cache/queue/scale sau.
8. Nếu sửa code vì test fail, thêm test hồi quy phù hợp và cập nhật tài liệu nếu hành vi thay đổi.

Output mong đợi sau mỗi vòng:

- Test plan đã chạy và thông số cấu hình.
- Bảng kết quả p50/p95/p99, RPS, error rate.
- Danh sách endpoint/flow fail hoặc chậm.
- Nhận định bottleneck có bằng chứng.
- Patch code/test/docs nếu có sửa.
- Việc cần test tiếp.

## 1. Phạm Vi & Chuẩn Bị

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Chốt commit/branch được test | commit hash, branch, ngày test | TODO |
| [ ] | Xác định app trong phạm vi: `kids-api`, `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`, `kids-landing` | danh sách app/version | TODO |
| [ ] | Xác định môi trường test: local/staging/prod-like | URL, cấu hình máy, DB, storage | TODO |
| [ ] | Xác định dữ liệu test: số tenant, school, classroom, student, staff, parent, invoice, media | seed profile | TODO |
| [ ] | Tạo account test theo role: platform admin, school admin, principal, teacher, nurse, finance, parent | credential test an toàn | TODO |
| [ ] | Bật log/metrics cần thiết: API latency, DB query, CPU/RAM, error rate | dashboard/log sample | TODO |
| [ ] | Có script cleanup/reset dữ liệu test | command/script | TODO |
| [ ] | Chốt ngưỡng pass/fail trước khi chạy | bảng SLO/SLA test | TODO |

## 2. Chỉ Số & Ngưỡng Đề Xuất

Các ngưỡng dưới đây là baseline ban đầu. Điều chỉnh theo cấu hình staging/prod thực tế.

| Metric | Mục tiêu ban đầu | Ghi chú |
| --- | ---: | --- |
| API error rate | `< 1%` dưới tải mục tiêu | 4xx hợp lệ không tính nếu test cố ý |
| Login p95 | `< 800ms` | không tính cold start |
| List endpoint p95 | `< 500ms` | có pagination |
| Write endpoint p95 | `< 900ms` | create/update domain |
| Dashboard p95 | `< 1200ms` | có thể aggregate nhiều bảng |
| Media upload p95 | `< 3000ms` | phụ thuộc kích thước ảnh |
| DB CPU | `< 75%` ổn định | theo cửa sổ 5 phút |
| API CPU | `< 75%` ổn định | tránh saturation |
| Memory | không tăng liên tục | kiểm tra leak bằng soak test |
| DB connection | không chạm max pool | có cảnh báo khi > 80% |
| p99 | không vượt p95 quá xa | dấu hiệu tail latency/query lock |

## 3. Load Test Cơ Bản

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Smoke load 1 tenant, 5 user đồng thời, 5 phút | không lỗi, latency ổn định | TODO |
| [ ] | Baseline read-heavy: login, `/me`, danh sách học sinh, lớp, thông báo, dashboard | p95 đạt ngưỡng | TODO |
| [ ] | Baseline write-heavy: tạo điểm danh, báo cáo ngày, đơn nghỉ, đơn thuốc, hóa đơn | không duplicate/lost update | TODO |
| [ ] | Mixed workload giống giờ cao điểm buổi sáng | hệ thống ổn định | TODO |
| [ ] | Tải platform admin: list tenant, subscription, invoice, worklist | không ảnh hưởng tenant API quá mức | TODO |
| [ ] | Tải public landing/signup/plans/tenant discovery | không làm chậm auth/domain API quá mức | TODO |
| [ ] | Tải media download ảnh album/report | không nghẽn API chính | TODO |
| [ ] | Tải export CSV/print invoice | không timeout hàng loạt | TODO |

## 4. Stress, Spike, Soak & Breakpoint

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Ramp-up từ 10 lên 100 user đồng thời | latency tăng tuyến tính, error thấp | TODO |
| [ ] | Ramp-up tới khi vượt ngưỡng | xác định breakpoint rõ ràng | TODO |
| [ ] | Spike test: tăng tải đột ngột 5x trong 1-2 phút | không sập process, phục hồi sau spike | TODO |
| [ ] | Soak test 2-4 giờ ở tải mục tiêu | không memory leak, không connection leak | TODO |
| [ ] | Burst login đầu giờ: nhiều phụ huynh/giáo viên đăng nhập cùng lúc | rate limit hợp lý, không khóa người dùng thật | TODO |
| [ ] | Burst điểm danh buổi sáng: nhiều lớp ghi attendance cùng lúc | không duplicate, không lock lâu | TODO |
| [ ] | Burst gửi thông báo announcement toàn trường | không timeout, notification fan-out ổn định | TODO |
| [ ] | Burst upload album/report photo | CPU/RAM ổn định, không lỗi xử lý ảnh hàng loạt | TODO |
| [ ] | Recovery test sau quá tải: giảm tải về baseline | latency/error quay lại bình thường | TODO |

## 5. Multi-Tenant Load & Isolation

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | 10 tenant hoạt động đồng thời, mỗi tenant nhiều role | không rò dữ liệu, latency ổn định | TODO |
| [ ] | Tenant lớn có nhiều request không làm tenant nhỏ timeout liên tục | fairness chấp nhận được | TODO |
| [ ] | Token tenant A gọi song song vào host/header tenant B dưới tải cao | luôn bị chặn | TODO |
| [ ] | Parent nhiều tenant truy vấn "con của tôi" đồng thời | chỉ trả đúng học sinh thuộc parent | TODO |
| [ ] | Staff nhiều school chuyển scope liên tục | không trộn dữ liệu school | TODO |
| [ ] | Platform API đọc dashboard trong lúc tenant API tải cao | không deadlock/timeout dây chuyền | TODO |
| [ ] | Tenant discovery `/public/tenants` bị gọi nhiều | vẫn không trả MST/email/gói/bank | TODO |
| [ ] | Tenant suspended/past_due dưới tải | guard vẫn chặn/cho đúng theo rule | TODO |

## 6. Database, Schema & Query Performance

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Kiểm tra slow query log khi chạy load test | danh sách query chậm | TODO |
| [ ] | Các list endpoint có pagination và index phù hợp `tenantId/schoolId/date/status` | EXPLAIN hoặc query plan | TODO |
| [ ] | Dashboard aggregate không scan toàn bộ tenant không cần thiết | query plan | TODO |
| [ ] | Unique constraint chống duplicate attendance/invoice/payment khi ghi đồng thời | concurrency test | TODO |
| [ ] | Transaction không giữ lock lâu khi tạo invoice/payment/webhook | DB lock evidence | TODO |
| [ ] | Connection pool không cạn dưới tải | pool metrics | TODO |
| [ ] | Migration chạy trên dataset lớn có thời gian chấp nhận được | dry-run/staging migration | TODO |
| [ ] | Seed/demo data lớn có thể tạo lại nhanh và ổn định | seed timing | TODO |
| [ ] | Delete/soft-delete không gây orphan hoặc cascade nhầm tenant | integrity test | TODO |

## 7. API Contract & Regression Test

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | `pnpm exec tsc --noEmit` trong `kids-api` sạch | command output | TODO |
| [ ] | `pnpm lint` trong `kids-api` sạch | command output | TODO |
| [ ] | `pnpm test:e2e` trong `kids-api` sạch | command output | TODO |
| [ ] | API response envelope đúng `{ success, data, meta/error }` | contract sample | TODO |
| [ ] | Error code ổn định cho FE xử lý | negative test | TODO |
| [ ] | Query param sai kiểu trả 400, không 500 | negative test | TODO |
| [ ] | Pagination cap hoạt động trên list lớn | API test | TODO |
| [ ] | Export/print/media raw response không phá contract ở endpoint JSON khác | API test | TODO |
| [ ] | Swagger/API docs khớp controller thực tế | endpoint diff | TODO |

## 8. Functional Flow Test

| Check | Luồng nghiệp vụ | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Public signup trường mới | tạo tenant/admin/subscription đúng | TODO |
| [ ] | Login chọn trường bằng dropdown `/public/tenants` + `x-tenant` | vào đúng tenant | TODO |
| [ ] | Tạo school/classroom/student/guardian | dữ liệu liên kết đúng | TODO |
| [ ] | Phân công giáo viên theo tuần | teacher thấy đúng lớp/scope | TODO |
| [ ] | Điểm danh hàng loạt theo lớp | không duplicate, dashboard cập nhật | TODO |
| [ ] | Báo cáo ngày kèm ảnh | media link đúng quyền | TODO |
| [ ] | Đơn nghỉ: parent tạo, staff duyệt | state machine đúng | TODO |
| [ ] | Thuốc: parent tạo, nurse xử lý | trạng thái/history đúng | TODO |
| [ ] | Sự cố sức khỏe | notification/audit đúng | TODO |
| [ ] | Học phí: tạo invoice, VietQR/cash/VNPay sandbox | trạng thái payment/invoice đúng | TODO |
| [ ] | Announcement/menu/lesson plan/album | audience/scope đúng | TODO |
| [ ] | Dashboard school/platform | KPI đúng theo dữ liệu seed | TODO |

## 9. Concurrency & Data Integrity

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Hai request tạo điểm danh cùng học sinh/ngày | chỉ có 1 record hợp lệ | TODO |
| [ ] | Hai request thanh toán cùng invoice | không double-pay | TODO |
| [ ] | Replay VNPay webhook cùng transaction | idempotent | TODO |
| [ ] | Nhiều admin sửa cùng student/classroom | không mất dữ liệu quan trọng | TODO |
| [ ] | Parent gửi nhiều đơn nghỉ trùng ngày | rule xử lý rõ ràng | TODO |
| [ ] | Staff approve/reject cùng đơn thuốc cùng lúc | trạng thái cuối nhất quán | TODO |
| [ ] | Quota student/teacher/storage bị chạm khi nhiều request đồng thời | không vượt quota ngoài ý muốn | TODO |
| [ ] | Billing cron chạy cùng lúc admin đổi subscription | không tạo invoice/trạng thái sai | TODO |

## 10. Frontend, Browser & UX Test

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Build production của từng FE app thành công | build output | TODO |
| [ ] | Route guard hoạt động theo role và tenant | manual/e2e screen | TODO |
| [ ] | Network request luôn gửi token/tenant/language đúng | browser trace | TODO |
| [ ] | UI xử lý loading/empty/error/offline state | screenshot | TODO |
| [ ] | Form validation FE khớp backend validation | test case | TODO |
| [ ] | Không có text tràn/overlap trên mobile/desktop chính | screenshot responsive | TODO |
| [ ] | i18n VI/EN không vỡ layout, key thiếu không lộ ra UI | screenshot | TODO |
| [ ] | Browser compatibility: Chrome, Safari, Edge; mobile Safari/Chrome | matrix kết quả | TODO |
| [ ] | Accessibility cơ bản: keyboard navigation, label, contrast, focus state | audit result | TODO |
| [ ] | FE không gọi API liên tục gây vòng lặp tải | network trace | TODO |

## 11. Mobile/PWA/Native Test

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | PWA install/open/logout/login lại ổn định | manual test | TODO |
| [ ] | Cache PWA không giữ dữ liệu user cũ sau logout | cache inspection | TODO |
| [ ] | Mobile-web hoạt động trên mạng chậm/không ổn định | throttled test | TODO |
| [ ] | Native app build/smoke trên iOS/Android simulator hoặc thiết bị thật | build log/screenshot | TODO |
| [ ] | Native upload ảnh/camera/library permission đúng | device test | TODO |
| [ ] | Deep link hoặc refresh màn hình không làm mất tenant context | manual test | TODO |
| [ ] | Push notification sau này có test opt-in, token lifecycle, logout cleanup | design/test plan | TODO |

## 12. Media, File & Storage Test

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Upload ảnh hợp lệ nhiều kích thước | nén/lưu/trả URL đúng | TODO |
| [ ] | Upload file quá lớn | bị chặn, lỗi rõ ràng | TODO |
| [ ] | Upload định dạng sai/MIME sai | bị chặn | TODO |
| [ ] | Upload nhiều ảnh đồng thời | không cạn CPU/RAM/storage | TODO |
| [ ] | Download media tenant khác | 403/404 | TODO |
| [ ] | Xóa record có media liên quan | không orphan ngoài chính sách | TODO |
| [ ] | Quota storage bị chạm | chặn đúng và thông báo đúng | TODO |
| [ ] | Public blog asset cache đúng, không đọc file ngoài thư mục | header/path test | TODO |

## 13. Billing, Webhook & Cron Test

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Platform invoice public token xem được không cần login nhưng không lộ field nội bộ | response sample | TODO |
| [ ] | Mark paid/manual payment cập nhật subscription/tenant status đúng | API test | TODO |
| [ ] | VNPay sandbox success/fail/cancel/IPN | trạng thái đúng | TODO |
| [ ] | VNPay webhook sai chữ ký | bị từ chối | TODO |
| [ ] | Replay webhook | idempotent | TODO |
| [ ] | Cron mark overdue tuition | invoice chuyển trạng thái đúng | TODO |
| [ ] | Cron billing/dunning/grace | tenant/subscription đúng | TODO |
| [ ] | MRR snapshot cron/backfill | số liệu đúng và không duplicate | TODO |
| [ ] | Cron chạy khi một job fail | job khác không bị phá dây chuyền | TODO |

## 14. Observability & Ops Test

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Log có request id/correlation id hoặc đủ thông tin truy vết | log sample | TODO |
| [ ] | Log lỗi không chứa secret/token/password/PII nhạy cảm | log review | TODO |
| [ ] | Metrics có latency/error rate theo endpoint | dashboard | TODO |
| [ ] | Alert cho 5xx tăng, DB connection cao, auth failure spike, webhook fail | alert config | TODO |
| [ ] | Audit log tạo cho hành động nhạy cảm | audit samples | TODO |
| [ ] | Healthcheck phản ánh API/DB readiness | healthcheck result | TODO |
| [ ] | Có runbook khi DB down/storage full/API quá tải | runbook link | TODO |

## 15. Backup, Restore & Disaster Recovery

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Backup DB được tạo tự động và mã hóa | backup evidence | TODO |
| [ ] | Restore DB trên môi trường test thành công | restore log | TODO |
| [ ] | RPO/RTO được định nghĩa | tài liệu vận hành | TODO |
| [ ] | Migration có backup trước khi chạy production | release checklist | TODO |
| [ ] | Rollback app version được kiểm tra | deploy evidence | TODO |
| [ ] | Storage/media backup khớp DB references | integrity check | TODO |
| [ ] | Khôi phục tenant riêng lẻ có kế hoạch hoặc giới hạn rõ ràng | restore plan | TODO |

## 16. Bộ Lệnh Nền Trước Khi Báo Xong

Với thay đổi backend/API:

```bash
cd kids-api
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
pnpm exec tsc --noEmit
pnpm lint
pnpm test:e2e
```

Với thay đổi frontend:

```bash
cd kids-platform
pnpm build

cd ../kids-crm
pnpm build

cd ../kids-mobile-web
pnpm build

cd ../kids-landing
pnpm build
```

Với native app:

```bash
cd kids-mobile-native
pnpm lint
pnpm exec tsc --noEmit
```

Nếu lệnh chưa tồn tại ở app tương ứng, ghi rõ `N/A` và lý do.

## 17. Mẫu Báo Cáo Kết Quả Test

```md
## Test Run

- Ngày:
- Người/agent chạy:
- Commit:
- Môi trường:
- Dataset:
- Công cụ:
- Cấu hình tải: users, duration, ramp-up, workload mix

## Kết Quả Tổng Quan

| Metric | Kết quả | Ngưỡng | Pass/Fail |
| --- | ---: | ---: | --- |
| RPS |  |  |  |
| Error rate |  |  |  |
| p50 |  |  |  |
| p95 |  |  |  |
| p99 |  |  |  |
| API CPU/RAM |  |  |  |
| DB CPU/RAM/Connections |  |  |  |

## Findings

### [SEVERITY] Tiêu đề

- Khu vực:
- Kịch bản:
- Kết quả thực tế:
- Kỳ vọng:
- Bằng chứng:
- Nguyên nhân nghi ngờ:
- Đề xuất xử lý:
- Test hồi quy cần thêm:
```

