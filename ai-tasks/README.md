# AI Tasks — Tích hợp toàn bộ Mobile (Expo) với API

> Mục tiêu: hiện thực hoá **đầy đủ 27 màn hình** trong [`mocks/mobile/`](../mocks/mobile/)
> bằng app **Expo React Native** thật, nối với **NestJS API** thật, qua một
> **schema database mạnh – dễ mở rộng – bảo mật**.

---

## ⭐ Đọc trước nếu bạn là AI/người mới (onboarding 2 phút)

Bạn đang ở monorepo **pnpm + Turborepo, strict TypeScript** tên `kimthanh-kids` — hệ thống
quản lý trường mầm non KimThanh. Bạn **không cần** đọc lại lịch sử chat; mọi thứ cần biết
nằm trong các file `ai-tasks/*.md` này + các đường dẫn chúng trỏ tới.

**Bức tranh hệ thống** (chi tiết: [`docs/ai-context/project-summary.md`](../docs/ai-context/project-summary.md)):

- `apps/api` — NestJS + Prisma + PostgreSQL + JWT + RBAC (system of record).
- `apps/web` — Next.js 14 (landing + dashboard admin/finance/nurse). **Chưa làm trong đợt này**.
- `apps/mobile` — Expo SDK 51 + React Navigation v6 + NativeWind v4 + i18next + TanStack
  Query (app cho **Phụ huynh + Giáo viên**). **Đây là trọng tâm đợt này.**
- `packages/` — `shared-types` (DTO/enum), `shared-utils` (Zod/format), `shared-api-client`
  (SDK gọi API, **client chỉ được gọi API qua đây**), `shared-auth` (RBAC + Zustand auth),
  `shared-ui` (design tokens + primitives).

**6 luật bất biến (vi phạm = sai):**

1. Strict TS, **không `any`**.
2. **Không hardcode chuỗi UI** → luôn `t('…')`; mặc định ngôn ngữ người dùng = **vi**.
3. Enum đồng bộ **3 nơi**: Prisma ↔ `shared-types/enums.ts` ↔ Zod (`shared-utils/schemas.ts`).
4. App **chỉ** gọi API qua `@kimthanh/shared-api-client` (không `fetch` thẳng).
5. **Multi-tenant theo `schoolId`** — mọi query phải scope (trừ `SUPER_ADMIN`).
6. Response API dùng envelope `ApiResponse<T>` (`{ success, data | error }`).

**Phạm vi được phép (chủ dự án chốt):** được **đập đi xây lại database & API** cho sạch,
**nhưng** schema phải **chừa đường cho Web Dashboard** (admin/finance/nurse — xem
[`mocks/web/`](../mocks/web/), làm UI sau). Field/model "reserved for web" đánh dấu 🌐.

**Quy tắc khi làm việc trong các file này:**

- Mỗi task có **mã ID** (vd `API-J3`) và **trạng thái**. Trước khi làm: đổi sang `🟡 WIP`.
  Làm xong + tự kiểm "Done when": đổi `🟢 DONE`. Đừng xoá task đã xong (giữ vết).
- Làm **theo thứ tự phase** bên dưới; trong 1 phase có thể làm song song nếu không phụ thuộc.
- Khi sửa code, **cập nhật lại trạng thái** ngay trong file `ai-tasks/*.md` tương ứng để
  conversation/AI sau biết tới đâu.

### Legend trạng thái

| Tag | Nghĩa |
|-----|-------|
| 🔴 **TODO** | Chưa bắt đầu |
| 🟡 **WIP** | Đang làm (ghi tên người/agent + ngày nếu được) |
| 🟢 **DONE** | Đã xong và đã tự kiểm "Done when" |
| ⚪ **BLOCKED** | Chờ phụ thuộc / chờ quyết định (ghi rõ chờ gì) |

### Quy ước mã ID

`DB-*` = schema/migration · `SC-*` = shared contracts · `API-*` = backend NestJS ·
`MOB-*` = mobile Expo. Số đi theo mục trong từng file. ID **ổn định** — đừng đánh lại số.

---

## Thứ tự đọc / thực thi (phase)

| Phase | File | Nội dung | Phụ thuộc |
|-------|------|----------|-----------|
| 1 | [`01-database-schema.md`](./01-database-schema.md) | Thiết kế + migrate schema (`DB-*`) | — |
| 2 | [`02-shared-contracts.md`](./02-shared-contracts.md) | DTO · Zod · SDK · RBAC (`SC-*`) | Phase 1 |
| 3 | [`03-api-tasks.md`](./03-api-tasks.md) | Module NestJS (`API-*`) | Phase 1–2 |
| 3 | [`04-mobile-tasks.md`](./04-mobile-tasks.md) | App Expo, từng màn map 1-1 mock (`MOB-*`) | Phase 2–3 |
| ref | [`05-erd-and-ui-mapping.md`](./05-erd-and-ui-mapping.md) | Sơ đồ **ERD database** + bảng kiểm DB↔UI khớp 100% | tham chiếu |
| ref | [`06-screen-flow.md`](./06-screen-flow.md) | Sơ đồ **điều hướng giữa 27 màn** + workflow chéo PH↔GV | tham chiếu |

> Phase 3 (API và Mobile) chạy song song được vì cả hai đã có **hợp đồng chung** từ Phase 2.

## Bảng theo dõi tổng (cập nhật khi đổi trạng thái)

| Nhóm | Tổng task | DONE | WIP | TODO |
|------|-----------|------|-----|------|
| DB (01) | 8 nhóm | 0 | 0 | 8 |
| Shared (02) | 4 nhóm | 0 | 0 | 4 |
| API (03) | 13 nhóm | 0 | 0 | 13 |
| Mobile (04) | 5 nhóm | 0 | 0 | 5 |

> Bảng này là tóm tắt thủ công; nguồn sự thật là tag trạng thái trong từng file.

## Bản đồ màn hình → vai trò → tính năng → trạng thái backend

| Mock | Màn hình | Vai trò | Thực thể chính | API đã có? |
|------|----------|---------|----------------|------------|
| `splash.html` (M0) | Splash/bootstrap | tất cả | — | ✅ (auth/me) |
| `login.html` (M1) | Đăng nhập | tất cả | User | ✅ `/auth/login` |
| `register.html` (M2) | Đăng ký phụ huynh | guest | User(PARENT) | ✅ `/auth/register` |
| `home-parent.html` (M3a) | Trang chủ PH | PARENT | nhiều (aggregate) | ⚠️ cần endpoint tổng hợp |
| `home-teacher.html` (M3b) | Trang chủ GV | TEACHER | nhiều (aggregate) | ⚠️ cần endpoint tổng hợp |
| `children-list.html` (M4) | Danh sách con | PARENT | Student | ✅ `/students` |
| `student-detail.html` (M5) | Hồ sơ học sinh | PARENT/TEACHER | Student + tabs | ⚠️ cần allergies/parents |
| `class-roster.html` (T4) | Sĩ số lớp | TEACHER | Classroom+Attendance | ✅ |
| `attendance-mark.html` (M6) | Điểm danh | TEACHER | Attendance (bulk) | ⚠️ cần bulk endpoint |
| `attendance-history.html` (M7) | Lịch sử điểm danh | PARENT | Attendance | ⚠️ cần range query |
| `report-compose.html` (M8) | Soạn báo cáo | TEACHER | DailyReport | ✅ `/reports` |
| `report-feed.html` (M9) | Feed báo cáo | PARENT | DailyReport | ✅ |
| `lesson-plan.html` (T8) | Giáo án tuần | TEACHER | **LessonPlan** (mới) | ❌ |
| `menu-weekly.html` (P14) | Thực đơn tuần | PARENT | **MenuItem + StudentAllergy** (mới) | ❌ |
| `leave-request.html` (P15) | Xin nghỉ học | PARENT | **LeaveRequest** (mới) | ❌ |
| `medicine-list.html` (M10) | DS yêu cầu thuốc | PARENT | MedicineRequest | ✅ |
| `medicine-create.html` (M11) | Tạo yêu cầu thuốc | PARENT | MedicineRequest | ✅ |
| `medicine-detail.html` (M12) | Chi tiết + timeline | PARENT/NURSE | **+ MedicineAdministration** (mới) | ⚠️ |
| `medicine-approve.html` (T9) | Duyệt thuốc | NURSE/TEACHER | MedicineRequest | ⚠️ cần approve/reject |
| `invoices.html` (M13) | Học phí | PARENT | TuitionInvoice | ✅ |
| `payment-checkout.html` (P13) | Thanh toán online | PARENT | **InvoiceLineItem + PaymentIntent** (mới) | ❌ |
| `announcements-feed.html` (M14) | Bảng tin thông báo | PARENT | Announcement(+cover) | ⚠️ cần cover media |
| `announcement-compose.html` (M15) | Soạn thông báo | TEACHER/ADMIN | Announcement | ✅ |
| `notifications.html` (M17) | Thông báo đẩy | tất cả | **Notification + DeviceToken** (mới) | ❌ |
| `chat-parent.html` (T12) | Hộp thư (GV) | TEACHER | **Conversation/Message** (mới) | ❌ |
| `chat-teacher.html` (P16) | Chat (PH) | PARENT | **Conversation/Message** (mới) | ❌ |
| `profile.html` (M16) | Hồ sơ cá nhân | tất cả | User (+đổi mật khẩu) | ⚠️ cần change-password |

Legend: ✅ có · ⚠️ có một phần / cần bổ sung · ❌ chưa có.

## Cách tiếp cận kỹ thuật (đọc từ mock — KHÔNG sáng tạo lại UI)

- **Design tokens** lấy đúng từ [`mocks/shared.css`](../mocks/shared.css): `--primary:#F26B5E`,
  `--accent:#F89A5B`, `--success:#7BC796`, `--danger:#FF7A7A`, `--sand:#FFF8F3`,
  `--ink:#3A1F1A`, `--muted:#8B6F68`. Font **Be Vietnam Pro**. Card bo `1rem`, nút primary
  shadow cam. → đưa vào `tailwind.config.js` mobile (NativeWind).
- **Icon**: mock dùng `lucide` → mobile dùng `lucide-react-native`.
- **Mỗi mock = 1 screen Expo** trong `apps/mobile/src/screens/<role|shared>/...`.
- **Data fetching**: TanStack Query bọc `apiSdk`. Không `fetch` thẳng.
- **Toast**: mock dùng `toast()` ([`mocks/shared.js`](../mocks/shared.js)) → thay bằng toast RN.
</content>
