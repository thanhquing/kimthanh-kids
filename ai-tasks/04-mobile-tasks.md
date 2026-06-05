# 04 — Mobile Tasks (Expo React Native)

> Trạng thái mỗi task: 🔴 TODO · 🟡 WIP · 🟢 DONE · ⚪ BLOCKED (xem [README](./README.md)).
>
> **Bối cảnh cho AI mới:** app ở [`apps/mobile`](../apps/mobile). Stack đã cài: Expo SDK 51,
> React Navigation v6 (`native-stack` + `bottom-tabs`), NativeWind v4, i18next, TanStack
> Query, Zustand auth (`@kimthanh/shared-auth`), SDK `apiSdk`
> ([`apps/mobile/src/lib/api-client.ts`](../apps/mobile/src/lib/api-client.ts) — token lưu
> SecureStore, locale qua AsyncStorage). Navigation hiện có:
> [`root-navigator.tsx`](../apps/mobile/src/navigation/root-navigator.tsx) route theo role,
> `parent-navigator.tsx` / `teacher-navigator.tsx` (mới scaffold 3 tab, sẽ mở rộng).
> Screen mẫu hiện là placeholder (`<Text>{t(...)}</Text>`).
>
> **MỆNH LỆNH: KHÔNG sáng tạo lại UI.** Mỗi mock trong [`mocks/mobile/`](../mocks/mobile/) là
> HTML + class Tailwind + [`mocks/shared.css`](../mocks/shared.css). Đọc đúng layout/màu/
> spacing/icon/chuỗi từ mock rồi dựng lại bằng RN + NativeWind. Mọi data qua `apiSdk` (cấm
> `fetch`), mọi chuỗi qua `t(...)` (cấm hardcode, mặc định `vi`).

---

## MOB-0 · Nền tảng (làm TRƯỚC mọi screen)

**Trạng thái: 🔴 TODO** · Phụ thuộc: SC-* (contracts), API-* (để có data thật; có thể dựng
UI trước với mock data rồi nối).

### MOB-0.1 Dependencies (`apps/mobile/package.json`)

- [ ] `lucide-react-native` + `react-native-svg` (icon — mock dùng `lucide`).
- [ ] `expo-image` (avatar/hero), `expo-image-picker` (M8/P15/P16 chọn ảnh).
- [ ] `expo-notifications` + `expo-device` (push — MOB-4).
- [ ] `react-native-toast-message` (thay `toast()` của `mocks/shared.js`).
- [ ] `@react-native-community/datetimepicker` (M11/P15 ngày), `expo-web-browser` (P13 cổng
  thanh toán), `@expo-google-fonts/be-vietnam-pro` + `expo-font`.

### MOB-0.2 Theme tokens (`apps/mobile/tailwind.config.js`) — lấy từ `mocks/shared.css`

- [ ] `theme.extend.colors`: `primary:#F26B5E`, `primary600:#E25548`, `accent:#F89A5B`,
  `success:#7BC796`, `danger:#FF7A7A`, `warning:#FFD27A`, `sand:#FFF8F3`, `ink:#3A1F1A`,
  `muted:#8B6F68`. Nạp font **Be Vietnam Pro**.

### MOB-0.3 Primitives dùng chung (`packages/shared-ui`, bản native) — tái dùng cho web 🌐

- [ ] `Card` (bo `1rem`, shadow nhẹ), `Badge` (variants `green/amber/red/slate/blue/peach`
  = class `.b-*`), `Chip` (active nền primary), `Button` (`primary` shadow cam, `soft`),
  `Field`/`Label`, `Avatar` (gradient primary→accent), `SectionTitle`, `KpiCard`,
  `ScreenHeader` (back `chevron-left` + title giữa + action phải — block `absolute top-0…`
  lặp ở hầu hết mock). Khớp đúng `.card/.badge/.chip/.btn-primary/.field/.avatar` trong CSS.

### MOB-0.4 Hạ tầng app

- [ ] `App.tsx`: bọc `SafeAreaProvider` + `QueryClientProvider` + `NavigationContainer` +
  `RootNavigator` + `<Toast/>`.
- [ ] `src/lib/query-keys.ts` (key chuẩn hoá) + `src/hooks/` (mỗi feature 1 hook `useXxx`
  bọc `apiSdk`). **Cấm `fetch` thẳng.**
- [ ] i18n: thêm key cho mọi chuỗi mới vào `apps/mobile/locales/{vi,en}/common.json`
  (vi là nguồn — mock toàn tiếng Việt).

### MOB-0.5 Navigation

- [ ] **Parent tabs** (`parent-navigator.tsx`): Trang chủ(home) · Con tôi(users) ·
  Tin nhắn(message-circle) · Thông báo(bell) · Hồ sơ(user). Mỗi tab là **stack** để push màn con.
  > ⚪ **Quyết định cần xác nhận:** mock không nhất quán tab thứ 3 của PH (chỗ là *Thông báo*,
  > chỗ là *Tin nhắn*). Đề xuất **5 tab** như trên. Nếu chốt 4 tab, đưa Thông báo vào header.
- [ ] **Teacher tabs** (`teacher-navigator.tsx`): Trang chủ · Lớp(school) · Báo cáo(file-text)
  · Thông báo(bell) · Hồ sơ(user) — nhất quán trong mock.
- [ ] `root-navigator.tsx`: giữ logic role; NURSE dùng lại stack y tế (medicine-approve);
  Splash (M0) = trạng thái bootstrap khi đang gọi `/auth/me`.

**Done when:** app build & chạy `expo start`; 1 screen mẫu dùng được primitives + theme +
hook; điều hướng 2 navigator hoạt động.

---

## MOB-1 · Auth & Shared (M0, M1, M2, M16)

**Trạng thái: 🔴 TODO** · Phụ thuộc: MOB-0, API-B.

- [ ] **MOB-1.1 Splash M0** (`splash.html`): full-screen `brand-grad` + logo + "Mầm non
  hạnh phúc" + 3 chấm bounce. Hiện khi khôi phục phiên.
- [ ] **MOB-1.2 Login M1** (`login.html`): hero image + logo + form email/password (toggle
  `eye`) + "Quên mật khẩu?" + link Đăng ký. `useLogin` → `apiSdk.auth.login`; lưu token;
  toast lỗi.
- [ ] **MOB-1.3 Register M2** (`register.html`): họ tên/email/sđt(tuỳ chọn)/mật khẩu +
  **thanh đo độ mạnh 4 vạch** (theo `passwordSchema`) + xác nhận → `apiSdk.auth.register`.
- [ ] **MOB-1.4 Profile M16** (`profile.html`): avatar + thông tin; Cài đặt: ngôn ngữ VI/EN
  (`apiSdk.users.updateMe({locale})` + `i18n.changeLanguage`), dark mode (state client/
  nativewind colorScheme), Đổi mật khẩu (`apiSdk.auth.changePassword`), Đăng xuất (xoá token
  + reset query cache).

**Done when:** đăng nhập/đăng ký/đăng xuất/đổi mật khẩu chạy thật với API.

---

## MOB-2 · Parent screens

**Trạng thái: 🔴 TODO** · Phụ thuộc: MOB-0, API-A/C/D/E/G/H/I/J/K/L.

- [ ] **MOB-2.1 Home M3a** (`home-parent.html`): greeting + avatar; card gradient "N con đi
  học" + badge từng bé; hàng ngang "Con của tôi"; "Khoảnh khắc hôm nay" (ảnh + caption);
  "Thông báo gần đây" (2 card); card "hóa đơn chưa thanh toán". `apiSdk.dashboard.parentHome`.
- [ ] **MOB-2.2 Children list M4** (`children-list.html`): card avatar + tên + "Lớp · tuổi"
  + chevron. `apiSdk.students.list`. Bấm → Student detail.
- [ ] **MOB-2.3 Student detail M5** (`student-detail.html`): header avatar lớn, tên, biệt
  danh, badge giới tính/lớp, ngày sinh·tuổi; **chip tabs** Tổng quan/Điểm danh/Báo cáo/Sức
  khỏe/Học phí/Hình ảnh. Tab Tổng quan: trạng thái hôm nay + list phụ huynh (relationship).
  Các tab khác push tới history/feed/... `apiSdk.students.getById`.
- [ ] **MOB-2.4 Attendance history M7** (`attendance-history.html`): lịch tháng 7 cột tô màu
  (xanh/vàng/đỏ) + chú thích đếm + list "Gần đây". `apiSdk.attendance.historyForStudent`.
- [ ] **MOB-2.5 Report feed M9** (`report-feed.html`): card theo ngày + emoji mood + meta
  cô/lớp + 3 dòng Bữa ăn/Ngủ trưa/Hoạt động + ảnh. `apiSdk.reports.listForStudent`.
- [ ] **MOB-2.6 Menu weekly P14** (`menu-weekly.html`): chip ngày T2–T6; 3 card bữa
  (Sáng/Trưa/Xế) badge giờ + món + kcal; **cảnh báo dị ứng** (card vàng). `apiSdk.menu.getWeek`.
- [ ] **MOB-2.7 Leave request P15** (`leave-request.html`): select con, chip loại (Ốm/Việc
  gia đình/Khác), date Từ–Đến, textarea lý do, đính kèm (picker→`media.presign`).
  `apiSdk.leave.create` + validate `createLeaveRequestSchema`.
- [ ] **MOB-2.8 Medicine list M10** (`medicine-list.html`): chip filter + list card (tên,
  badge, bé·liều, khoảng ngày), nút `plus`→create. `apiSdk.health.listMedicineRequests`.
- [ ] **MOB-2.9 Medicine create M11** (`medicine-create.html`): select con, tên thuốc, liều,
  lịch, date Từ–Đến, lý do → `apiSdk.health.createMedicineRequest`.
- [ ] **MOB-2.10 Medicine detail M12** (`medicine-detail.html`): card thông tin + grid
  liều/lịch/ngày + lý do + **timeline trạng thái** + ghi chú y tá.
  `apiSdk.health.getMedicineRequest`.
- [ ] **MOB-2.11 Invoices M13** (`invoices.html`): chip Chưa(2)/Đã/Tất cả; card hoá đơn
  (tháng, badge, bé, số tiền, hạn). Nút → checkout (nếu bật) / "Liên hệ trường".
  `apiSdk.finance.listInvoices`.
- [ ] **MOB-2.12 Payment checkout P13** (`payment-checkout.html`): card gradient tổng + hạn;
  "Chi tiết khoản thu" (lineItems); radio VNPay/Bank/Momo; nút thanh toán →
  `createPaymentIntent` → mở `redirectUrl` (`expo-web-browser`) → quay lại poll
  `getPaymentIntent`. `apiSdk.finance.getInvoice`.
- [ ] **MOB-2.13 Announcements feed M14** (`announcements-feed.html`): card (ảnh bìa tuỳ
  chọn, badge audience, thời gian tương đối, tiêu đề, nội dung). `apiSdk.announcements.list`.
- [ ] **MOB-2.14 Notifications M17** (`notifications.html`): card icon theo `type` (màu nền
  khác), tiêu đề/mô tả/thời gian, chấm đỏ chưa đọc (`opacity-70` khi đã đọc); bấm→deep-link;
  mark read. `apiSdk.notifications.list`.
- [ ] **MOB-2.15 Chat thread P16** (`chat-teacher.html`): bong bóng trái (cô, nền trắng)/phải
  (mình, `brand-grad`), ảnh trong bong bóng, thanh nhập + icon ảnh + nút gửi.
  `apiSdk.messaging.getMessages` + `sendMessage`. (dùng chung component với T12).

**Done when:** mọi màn PH render từ data thật, đúng layout mock.

---

## MOB-3 · Teacher + Nurse screens

**Trạng thái: 🔴 TODO** · Phụ thuộc: MOB-0, API-A/D/E/F/I/K/L.

- [ ] **MOB-3.1 Home M3b** (`home-teacher.html`): greeting; card gradient lớp + sĩ số +
  present/late/absent; ảnh lớp; "Hành động nhanh" (Điểm danh/Báo cáo/Thông báo); "Cần xử lý".
  `apiSdk.dashboard.teacherHome`.
- [ ] **MOB-3.2 Class roster T4** (`class-roster.html`): 3 KPI + chip filter + list card
  (ảnh, tên, "PH: …", badge). `apiSdk.attendance.list` + `apiSdk.students.list`.
- [ ] **MOB-3.3 Attendance mark M6** (`attendance-mark.html`): card chọn ngày; mỗi bé 4 chip
  (Có mặt/Muộn/Vắng/Phép) chọn 1; nút "Lưu thay đổi (N)" đếm số thay đổi →
  `apiSdk.attendance.markBulk`.
- [ ] **MOB-3.4 Report compose M8** (`report-compose.html`): chip mood (→`ReportMood`),
  textarea bữa ăn, chip ngủ (→`NapQuality`), textarea hoạt động, ghi chú PH, upload ảnh
  (picker; mock ghi "Sắp ra mắt" → bật khi API-M xong). `apiSdk.reports.create`.
- [ ] **MOB-3.5 Lesson plan T8** (`lesson-plan.html`): header "Giáo án · Tuần N" + chủ đề +
  nút "+ Hoạt động" + list card hoạt động (badge thứ, giờ, tên, mô tả, "📦 vật liệu").
  `apiSdk.lessonPlans.list` + `addActivity`.
- [ ] **MOB-3.6 Medicine approve T9** (`medicine-approve.html`) — NURSE/TEACHER: chip Chờ
  duyệt(N)/Đang dùng/Đã xong; card y/c + 2 nút Duyệt/Từ chối (reject yêu cầu lý do).
  `apiSdk.health.approve` / `reject`.
- [ ] **MOB-3.7 Announcement compose M15** (`announcement-compose.html`): tiêu đề, select
  đối tượng, nội dung, **thời điểm đăng** (datetime), card xem trước, nút Đăng.
  `apiSdk.announcements.create`.
- [ ] **MOB-3.8 Chat inbox T12** (`chat-parent.html`): ô tìm kiếm + list hội thoại (avatar,
  tên "Chị Lan (mẹ bé Minh)", thời gian, last message, badge unread `b-red`).
  `apiSdk.messaging.listConversations`. Bấm → Chat thread (dùng chung MOB-2.15).

**Done when:** mọi màn GV/Y tá render từ data thật, đúng layout mock.

---

## MOB-4 · Push notifications

**Trạng thái: 🔴 TODO** · Phụ thuộc: API-K.

- [ ] Khi đăng nhập: xin quyền `expo-notifications`, lấy Expo push token →
  `apiSdk.notifications.registerDevice({token, platform})`.
- [ ] Khi logout: `unregisterDevice`.
- [ ] Foreground: hiện toast; bấm notification → deep-link đúng màn (theo `entityType/entityId`).

**Done when:** nhận được push thật khi có điểm danh/report/tin nhắn và mở đúng màn.

---

## MOB-5 · Trạng thái UI chung

**Trạng thái: 🔴 TODO** · áp cho mọi list/detail.

- [ ] Loading skeleton (`common.loading`), empty (`common.empty`), error + retry.
- [ ] TanStack Query: `staleTime` hợp lý + pull-to-refresh cho feed/list.
- [ ] Offline 🌐 (known-limitation): để cache TanStack lo; chưa persist v1.

**Done when:** mọi màn có đủ 3 trạng thái loading/empty/error.

---

## Definition of Done (Phase 3 — Mobile)

- [ ] 27/27 mock có screen tương ứng, render đúng layout/màu/icon/chuỗi.
- [ ] `grep` không còn `fetch(`; mọi chuỗi qua `t(...)`.
- [ ] `pnpm --filter @kimthanh/mobile typecheck && lint` xanh; `expo start` chạy được luồng
  Parent và Teacher end-to-end với API + seed.
- [ ] Đối chiếu mở mock HTML cạnh app: spacing/màu khớp `mocks/shared.css`.
</content>
