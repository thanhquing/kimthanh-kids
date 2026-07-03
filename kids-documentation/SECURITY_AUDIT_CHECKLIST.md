# Security Audit Checklist — KimThanh Kids

Checklist này dùng để lập kế hoạch và theo dõi kiểm tra bảo mật cho toàn hệ thống KimThanh Kids: code, database/schema, API, backend và frontend.

Tài liệu nền cần đọc trước khi audit:

- [ARCHITECTURE.md](./ARCHITECTURE.md)
- [MULTI_TENANCY.md](./MULTI_TENANCY.md)
- [DATABASE_ERD.md](./DATABASE_ERD.md)
- [API.md](./API.md)
- [BILLING.md](./BILLING.md)

## Cách dùng

- Mỗi dòng checklist nên có người phụ trách, bằng chứng và trạng thái.
- Ưu tiên kiểm tra rò rỉ dữ liệu đa-tenant, phân quyền sai, public API lộ dữ liệu, xử lý file upload và token/session.
- Với lỗi mức High/Critical: tạo issue riêng, ghi rõ endpoint/module, cách tái hiện, dữ liệu bị ảnh hưởng và test phòng hồi quy cần thêm.
- Khi giao cho AI agent: yêu cầu agent đọc file này trước, audit theo thứ tự ưu tiên, ghi findings có bằng chứng, rồi mới sửa code kèm test.

| Trạng thái | Ý nghĩa |
| --- | --- |
| `TODO` | Chưa kiểm tra |
| `DOING` | Đang kiểm tra |
| `PASS` | Đạt, có bằng chứng |
| `FAIL` | Có lỗi, cần issue/fix |
| `N/A` | Không áp dụng, ghi lý do |

## Workflow Cho AI Agent

Mục tiêu: dùng checklist này để tìm lỗi có khả năng bị khai thác, sau đó điều chỉnh code để tăng khả năng chống tấn công cho hệ thống multi-tenant.

1. Đọc tài liệu nền theo thứ tự: [ARCHITECTURE.md](./ARCHITECTURE.md), [MULTI_TENANCY.md](./MULTI_TENANCY.md), [DATABASE_ERD.md](./DATABASE_ERD.md), [API.md](./API.md), [BILLING.md](./BILLING.md).
2. Lập inventory endpoint/controller/service/schema liên quan trước khi sửa.
3. Audit theo thứ tự ưu tiên: multi-tenancy/IDOR, RBAC, auth/session, public API, database/schema, upload/media, webhook/billing, frontend token/XSS/cache.
4. Với mỗi nghi vấn, tái hiện bằng test, request mẫu hoặc code reference. Không kết luận chỉ dựa vào tên hàm.
5. Nếu phát hiện lỗi, sửa hẹp đúng module, thêm test hồi quy tương ứng, cập nhật tài liệu nếu hành vi API/schema/permission thay đổi.
6. Trước khi báo xong, chạy lệnh nền theo mục [13. Test Matrix Bắt Buộc](#13-test-matrix-bat-buoc).
7. Không tự commit. Chỉ đề xuất commit message sau khi kiểm tra xong.

Output mong đợi sau mỗi vòng audit:

- Danh sách findings theo severity, có file/line hoặc endpoint cụ thể.
- Checklist các mục đã kiểm tra và bằng chứng.
- Patch code/test/docs nếu có lỗi.
- Kết quả `tsc --noEmit`, `lint`, `test:e2e`.
- Rủi ro còn lại và việc nên audit tiếp.

Ưu tiên xử lý:

| Priority | Nhóm lỗi | Vì sao ưu tiên |
| --- | --- | --- |
| P0 | Cross-tenant data leak, IDOR, bypass RBAC, token/session compromise | Có thể lộ dữ liệu trẻ/phụ huynh hoặc chiếm quyền |
| P1 | Public API data leak, upload/media abuse, webhook/payment tampering | Có bề mặt tấn công từ internet hoặc ảnh hưởng tiền |
| P2 | XSS/token leak/cache leak ở FE, logging PII, weak rate limit | Có thể leo thang hoặc lộ dữ liệu qua vận hành |
| P3 | Hardening infra, headers, dependency hygiene, observability | Giảm rủi ro nền và tăng khả năng phát hiện |

## 1. Phạm Vi & Chuẩn Bị

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Xác nhận commit/branch/release tag được audit | commit hash, branch, ngày audit | TODO |
| [ ] | Liệt kê app trong phạm vi: `kids-api`, `kids-platform`, `kids-crm`, `kids-mobile-web`, `kids-mobile-native`, `kids-landing` | danh sách app + version/package | TODO |
| [ ] | Liệt kê môi trường kiểm tra: local/staging/prod-like | URL, DB, tenant demo, account test | TODO |
| [ ] | Chuẩn bị tenant test tối thiểu: tenant A, tenant B, platform admin, school admin, teacher, nurse, finance, parent | seed data hoặc script tạo dữ liệu | TODO |
| [ ] | Xác nhận không dùng dữ liệu thật của trẻ/phụ huynh trong quá trình pentest | biên bản/screenshot cấu hình test | TODO |
| [ ] | Xác nhận chính sách severity và SLA xử lý lỗi | bảng Critical/High/Medium/Low | TODO |

## 2. Threat Model & Tài Sản Cần Bảo Vệ

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Xác định dữ liệu nhạy cảm: trẻ, phụ huynh, nhân sự, sức khỏe, thuốc, học phí, hóa đơn, ảnh, audit log | data inventory | TODO |
| [ ] | Xác định tác nhân: platform staff, chủ trường, giáo viên, y tế, kế toán, phụ huynh, người chưa đăng nhập | actor matrix | TODO |
| [ ] | Xác định trust boundary: public API, tenant API, platform API, webhook, media file, landing assets | sơ đồ luồng dữ liệu | TODO |
| [ ] | Xác định các luồng rủi ro cao: login chọn trường, `x-tenant`, subdomain tenant, public invoice token, upload media, VNPay webhook | danh sách abuse case | TODO |
| [ ] | Lập ma trận dữ liệu nào role nào được đọc/ghi | role/data access matrix | TODO |

## 3. Secrets, Env & Supply Chain

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Không có secret thật trong repo, docs, seed, `.env.example`, log test | kết quả secret scan | TODO |
| [ ] | `JWT_SECRET`, refresh secret, VNPAY secret, database URL, storage key đủ mạnh và tách theo môi trường | env review | TODO |
| [ ] | File env production không được bundle vào FE | kiểm tra build artifact | TODO |
| [ ] | Dependency không có lỗ hổng Critical/High chưa xử lý | `pnpm audit --prod` hoặc report tương đương | TODO |
| [ ] | Lockfile được commit và build dùng lockfile | review `pnpm-lock.yaml` + CI | TODO |
| [ ] | Script build/test không tải code tùy ý từ internet | review `package.json`, scripts, CI | TODO |

## 4. Backend Code — NestJS & Prisma

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Guard chain đúng thứ tự: throttling, JWT, tenant, subscription, roles | review `app.module.ts`/guard config | TODO |
| [ ] | Endpoint public chỉ dùng `@Public` khi thật sự cần | danh sách endpoint public đối chiếu [API.md](./API.md) | TODO |
| [ ] | Tất cả controller domain có `@Roles` phù hợp, không chỉ dựa vào FE ẩn nút | controller review | TODO |
| [ ] | Endpoint platform dùng `@PlatformRoles`, không lẫn với role tenant | controller review | TODO |
| [ ] | Endpoint có feature gating/quota dùng `@RequireFeature` hoặc service quota đúng nơi | module review + e2e | TODO |
| [ ] | Query/body/path params dùng Zod DTO hoặc pipe tương đương | DTO/controller review | TODO |
| [ ] | Không truyền object query raw vào Prisma nếu chưa validate kiểu | service review | TODO |
| [ ] | Không dùng `prisma.system` trong tenant service nếu không filter `tenantId` tường minh | `rg "prisma.system"` + code review | TODO |
| [ ] | `findUnique/update/delete` theo PK không gây IDOR; phải `findFirst` theo scope trước hoặc filter tenant/school tường minh | service review | TODO |
| [ ] | Nested `create`, `upsert`, `createMany` set `tenantId`/`schoolId` tường minh | service review | TODO |
| [ ] | Raw SQL nếu có phải parameterized và có tenant/school filter | `rg "\\$queryRaw|\\$executeRaw"` | TODO |
| [ ] | Lỗi trả về không lộ stack trace, SQL, secret, token, đường dẫn nội bộ | test lỗi validation/500 | TODO |
| [ ] | Log không ghi password, refresh token, access token, thông tin sức khỏe chi tiết, nội dung ảnh | log review | TODO |
| [ ] | `AuditService.log` ghi đủ hành động nhạy cảm: login/admin mutation/billing/tuition/medicine/media | audit event sample | TODO |
| [ ] | `NotificationsService.notify` không làm lộ dữ liệu nhạy cảm trong payload | payload review | TODO |

## 5. Authentication & Session

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Login yêu cầu tenant rõ ràng qua host hoặc `x-tenant`; không đăng nhập nhầm tenant | e2e tenant login | TODO |
| [ ] | JWT chứa claim tối thiểu, không chứa dữ liệu nhạy cảm dư thừa | decoded token sample | TODO |
| [ ] | Access token TTL ngắn, refresh token TTL/rotation đúng thiết kế | test refresh flow | TODO |
| [ ] | Refresh token được hash trong DB, không lưu plaintext | DB sample | TODO |
| [ ] | Logout/revoke refresh token hoạt động và token cũ không refresh được | e2e negative test | TODO |
| [ ] | Password hashing dùng bcrypt với cost phù hợp | code review | TODO |
| [ ] | Không cho enumerate account qua login/forgot password/signup | response comparison | TODO |
| [ ] | Rate limit login/refresh/public signup đủ chặt để giảm brute force | config + test | TODO |
| [ ] | Tài khoản inactive/suspended không truy cập được endpoint tenant | e2e negative test | TODO |

## 6. Multi-Tenancy & Authorization

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Tenant resolution đúng thứ tự và không bị spoof qua `Host`/`x-tenant` | test host/header matrix | TODO |
| [ ] | JWT tenant không khớp host/header bị chặn | e2e negative test | TODO |
| [ ] | Parent chỉ thấy dữ liệu của con mình | e2e parent isolation | TODO |
| [ ] | Staff chỉ thấy dữ liệu trong school scope được phân quyền | e2e school scope | TODO |
| [ ] | Finance không truy cập module sức khỏe nếu không có role | e2e RBAC | TODO |
| [ ] | Nurse không truy cập học phí nếu không có role | e2e RBAC | TODO |
| [ ] | Teacher không sửa billing/platform settings | e2e RBAC | TODO |
| [ ] | Platform staff không được đọc dữ liệu tenant nhạy cảm nếu endpoint không có mục đích hỗ trợ rõ ràng | platform API review | TODO |
| [ ] | Tenant A không đọc/sửa/xóa record Tenant B bằng ID đoán được | IDOR test matrix | TODO |
| [ ] | Public tenant discovery không trả dữ liệu nhạy cảm như MST, email, gói, bank | response sample | TODO |

## 7. Database & Schema

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Mọi model domain có `tenantId` và `schoolId` khi cần theo quy ước | review `prisma/schema.prisma` | TODO |
| [ ] | Model tenant-scoped đã được thêm vào `TENANT_KEY` | review `prisma-tenant.extension.ts` | TODO |
| [ ] | Unique constraint của dữ liệu tenant không vô tình unique toàn hệ thống | schema review | TODO |
| [ ] | Index hỗ trợ filter `tenantId`/`schoolId` để tránh full scan dữ liệu nhạy cảm | schema/index review | TODO |
| [ ] | Quan hệ cascade/delete không xóa dây chuyền ngoài phạm vi tenant | relation review + test | TODO |
| [ ] | Soft delete nếu có được filter nhất quán ở list/detail | service review | TODO |
| [ ] | Migration không drop/rename dữ liệu nhạy cảm mà thiếu plan backup/rollback | migration review | TODO |
| [ ] | Seed/demo không chứa secret production hoặc dữ liệu trẻ thật | seed review | TODO |
| [ ] | DB user production dùng quyền tối thiểu, không dùng superuser app runtime | config review | TODO |
| [ ] | Backup DB mã hóa, có kiểm thử restore, có retention rõ ràng | ops evidence | TODO |

## 8. API Security

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | API contract trong [API.md](./API.md) khớp controller thực tế | endpoint diff/review | TODO |
| [ ] | Swagger `/docs` không public ở production | config/test | TODO |
| [ ] | CORS chỉ cho origin hợp lệ, không wildcard khi gửi credential | config review | TODO |
| [ ] | Header bảo mật từ Helmet có hiệu lực | response headers | TODO |
| [ ] | Pagination có `pageSize` cap, tránh dump dữ liệu lớn | API test | TODO |
| [ ] | Sort/filter/search validate allowlist field | DTO/service review | TODO |
| [ ] | Public invoice token đủ khó đoán, không trả `id`/`publicToken` trong public payload | response sample | TODO |
| [ ] | Webhook VNPay xác minh chữ ký, idempotent, không tin amount/status từ client | code + replay test | TODO |
| [ ] | Endpoint print/export không bỏ qua authz/scope | e2e negative test | TODO |
| [ ] | Media download kiểm tra quyền xem file tenant/school/owner | e2e media access | TODO |
| [ ] | Upload giới hạn loại file, kích thước, extension, MIME sniffing và xử lý ảnh an toàn | upload test | TODO |
| [ ] | Không có path traversal ở public assets/media routes | fuzz path test | TODO |
| [ ] | Không có mass assignment vào field nhạy cảm như `tenantId`, `role`, `status`, `plan`, `price` | DTO review | TODO |
| [ ] | Response không trả field nội bộ: password hash, refresh token hash, secret, bank config riêng tư | response sample | TODO |

## 9. Frontend Security

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | FE luôn gửi đúng `x-tenant` sau khi người dùng chọn trường ở login | network trace | TODO |
| [ ] | Token storage được đánh giá rủi ro XSS; không log token ra console | code review | TODO |
| [ ] | Route guard chỉ để UX, backend vẫn enforce quyền | FE/BE review | TODO |
| [ ] | Không render HTML/Markdown từ API bằng `dangerouslySetInnerHTML` nếu chưa sanitize | `rg "dangerouslySetInnerHTML"` | TODO |
| [ ] | Link/file URL từ API được validate, không tạo open redirect hoặc script URL | component review | TODO |
| [ ] | Form không cho sửa field nhạy cảm bị ẩn rồi gửi lên API | request payload sample | TODO |
| [ ] | Upload UI chặn file quá lớn/sai loại trước khi gửi và hiển thị lỗi an toàn | manual test | TODO |
| [ ] | Error UI dùng `error.code`/message an toàn, không hiển thị stack/raw response | manual test | TODO |
| [ ] | Build production không chứa source map công khai nếu chưa có quyết định vận hành | build artifact review | TODO |
| [ ] | PWA/mobile-web cache không lưu dữ liệu nhạy cảm quá lâu hoặc giữa tài khoản | service worker/cache review | TODO |
| [ ] | Native app không hard-code API secret, payment secret hoặc token demo | code review | TODO |

## 10. App-Specific Checks

### `kids-platform`

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Chỉ platform role hợp lệ vào dashboard/admin tenant/billing/settings | RBAC e2e | TODO |
| [ ] | Không hiển thị hoặc export dữ liệu trẻ/phụ huynh ngoài mục đích support đã xác định | screen/API review | TODO |
| [ ] | Các thao tác đổi gói, đánh dấu thanh toán, cấu hình bank có audit log | audit samples | TODO |

### `kids-crm`

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Menu/trang quản trị trường bám role tenant, không gọi API ngoài quyền | route/API trace | TODO |
| [ ] | School scope được giữ khi chuyển cơ sở | manual/e2e test | TODO |
| [ ] | Các form nhân sự/học sinh không cho leo quyền qua payload | request review | TODO |

### `kids-mobile-web` / `kids-mobile-native`

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Parent không xem được dữ liệu học sinh khác qua deep link hoặc sửa ID | e2e/manual test | TODO |
| [ ] | Teacher/Nurse chỉ xem dữ liệu lớp/cơ sở được phân công | e2e/manual test | TODO |
| [ ] | Cache offline/PWA/native không giữ dữ liệu sau logout | manual test | TODO |
| [ ] | Push notification sau này không chứa PII nhạy cảm trong title/body | design review | TODO |

### `kids-landing`

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Public signup validate MST/slug/email và không spam được tenant creation | API + rate limit test | TODO |
| [ ] | Blog/Markdown content được sanitize để tránh XSS | content render review | TODO |
| [ ] | Public assets không đọc file ngoài thư mục cho phép | path traversal test | TODO |

## 11. Privacy, Logging & Compliance

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Dữ liệu trẻ em và sức khỏe được phân loại là sensitive trong checklist vận hành | data classification | TODO |
| [ ] | Log production có mask/redaction cho PII/token/health note/payment reference | log samples | TODO |
| [ ] | Audit log đủ thông tin truy vết nhưng không chứa secret | audit samples | TODO |
| [ ] | Chính sách retention cho ảnh, báo cáo ngày, thuốc, sự cố, học phí được xác định | retention policy | TODO |
| [ ] | Export CSV/print invoice có kiểm soát quyền và có audit khi cần | e2e + audit | TODO |
| [ ] | Backup/restore tuân thủ quyền truy cập tối thiểu | ops evidence | TODO |
| [ ] | Có quy trình xử lý sự cố rò rỉ dữ liệu: phát hiện, cô lập, thông báo, postmortem | incident runbook | TODO |

## 12. Infra & Deployment

| Check | Hạng mục | Bằng chứng cần có | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Production dùng HTTPS bắt buộc, HSTS nếu domain ổn định | headers/config | TODO |
| [ ] | DB không public internet hoặc được firewall/IP allowlist | network evidence | TODO |
| [ ] | Container/runtime không chạy bằng quyền root nếu không cần | Docker/deploy review | TODO |
| [ ] | Healthcheck không lộ secret/env/version nội bộ quá chi tiết | endpoint review | TODO |
| [ ] | CI chạy typecheck, lint, e2e và dependency/security scan trước deploy | CI evidence | TODO |
| [ ] | Có alert cho lỗi auth spike, login brute force, webhook fail, 5xx tăng bất thường | monitoring evidence | TODO |
| [ ] | Có backup trước migration production và rollback plan | release checklist | TODO |

<a id="13-test-matrix-bat-buoc"></a>

## 13. Test Matrix Bắt Buộc

Chạy các test nền trước khi kết luận audit code không làm vỡ hệ thống:

```bash
cd kids-api
export PATH="$HOME/.nvm/versions/node/v20.20.2/bin:$PATH"
pnpm exec tsc --noEmit
pnpm lint
pnpm test:e2e
```

Thêm hoặc chạy lại các test bảo mật sau nếu có thay đổi liên quan:

| Check | Kịch bản | Kỳ vọng | Trạng thái |
| --- | --- | --- | --- |
| [ ] | Token tenant A gọi endpoint tenant B qua `Host` tenant B | 403/401, không trả dữ liệu | TODO |
| [ ] | Parent sửa `studentId` sang học sinh không phải con mình | 403/404 | TODO |
| [ ] | Teacher sửa/xóa invoice học phí | 403 | TODO |
| [ ] | Finance truy cập medicine/health record | 403 | TODO |
| [ ] | Nurse truy cập tuition payment | 403 | TODO |
| [ ] | User inactive gọi endpoint domain | 403/401 | TODO |
| [ ] | Public tenant search bằng MST | Có thể tìm, nhưng response không trả MST | TODO |
| [ ] | Public invoice token sai/đoán ID tuần tự | 404 | TODO |
| [ ] | Replay webhook VNPay cùng transaction | idempotent, không double-pay | TODO |
| [ ] | Upload file `.php`, SVG script, ảnh quá lớn, MIME sai | bị chặn | TODO |
| [ ] | Media ID tenant khác | 403/404 | TODO |
| [ ] | Query param sai kiểu ở list/detail | 400 validation, không 500 | TODO |
| [ ] | Payload có `tenantId`/`role`/`status` tự gắn | bị bỏ qua hoặc 400 | TODO |

## 14. Báo Cáo Kết Quả Audit

Mỗi phát hiện nên ghi theo mẫu:

```md
### [SEVERITY] Tiêu đề ngắn

- Khu vực: app/module/endpoint/file
- Ảnh hưởng: dữ liệu/role/tenant bị ảnh hưởng
- Cách tái hiện:
- Kết quả thực tế:
- Kết quả mong đợi:
- Nguyên nhân gốc:
- Khuyến nghị sửa:
- Test phòng hồi quy cần thêm:
- Bằng chứng: request/response/log/screenshot
```

Tổng kết audit:

| Severity | Số lượng | Đã fix | Còn mở | Ghi chú |
| --- | ---: | ---: | ---: | --- |
| Critical | 0 | 0 | 0 |  |
| High | 0 | 0 | 0 |  |
| Medium | 0 | 0 | 0 |  |
| Low | 0 | 0 | 0 |  |
