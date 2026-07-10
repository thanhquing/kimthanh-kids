# Phase mobile-native (Expo) — copy-first từ kids-mobile-web

> **Chiến lược (D5, [PHASE_UI_TASKS.md](./PHASE_UI_TASKS.md)):** 2 codebase tách, chia sẻ **logic** bằng copy. Copy `src/api`+`src/i18n`+`src/lib` từ `kids-mobile-web`, **chỉ viết lại UI** bằng React Native. Đổi logic ở mobile-web → diff cơ học sang đây.
>
> Flow nghiệp vụ P0/P1 (GV + PH): [PHASE_UI_TASKS.md §6](./PHASE_UI_TASKS.md) + kịch bản [../kids-mobile-web/FE_TEST_SCENARIOS.md](../kids-mobile-web/FE_TEST_SCENARIOS.md).

Status: TODO / PROGRESS / DONE.

## 0. Quyết định stack (chốt)

| # | Quyết định | Chốt |
|---|---|---|
| N1 | Framework | **Expo (SDK mới) + expo-router** (file-based, mirror route web) |
| N2 | Styling | **NativeWind v4** — giữ class Tailwind từ mobile-web tối đa |
| N3 | Server-state | **@tanstack/react-query** (copy hooks `src/api/*` nguyên xi) |
| N4 | Storage | token → **expo-secure-store**; lang/tenant/cache → **react-native-mmkv** |
| N5 | Ảnh media (Bearer) | **expo-image** với `headers: { Authorization }` (RN hỗ trợ sẵn) |
| N6 | List dài | **@shopify/flash-list** (roster, feed, notifications) |
| N7 | Package manager | **pnpm** + `.npmrc` `node-linker=hoisted` (Metro/Expo + pnpm) |
| N8 | i18n | copy `src/i18n` (vi/en + `useT` dùng `useSyncExternalStore`) |

## 1. Scaffold + nền (P0)
- [x] Scaffold Expo SDK 56 (expo-router + TS) trong `kids-mobile-native/`
- [x] `.npmrc` (`node-linker=hoisted`) + `.gitignore` (`node_modules`,`.expo`,`dist`,`.env`, native build output)
- [x] Cài deps: nativewind, react-query, expo-secure-store, react-native-mmkv, expo-image, @shopify/flash-list, Zustand, gorhom sheet, Reanimated/Gesture, NetInfo
- [x] Cấu hình NativeWind (babel/metro/tailwind.config) + port token màu/`card`/`field`/`chip`… từ mobile-web `index.css`
- [x] Root script `dev:mobile` đã có (`cd kids-mobile-native && pnpm start`)

## 2. Copy tầng logic + adapter biên (P0)
- [x] Copy `src/api/*` (http, auth, public, students, attendance, reports, medicine, health, tuition, leave, announcements, notifications, menus, lessonPlans, albums)
- [x] **Sửa `api/http.ts`**: storage adapter (SecureStore/MMKV) thay localStorage; `baseURL=EXPO_PUBLIC_API_URL`; giữ header `x-tenant` + `x-language` + refresh 401
- [x] Copy `src/i18n/*` + `src/lib/*` (`language.ts` đổi backing store; display/date/routes giữ nguyên shape; `mobileState` đổi Zustand)
- [x] `tsc` sạch sau copy

## 3. Login vertical (P0 — chứng minh pattern end-to-end)
- [x] `TenantSelect` RN trong `LoginScreen` (FlashList danh sách `/public/tenants`, tên+mã+MST) → lưu tenantId
- [x] Màn login: chọn trường + SĐT + mật khẩu → `login(input, tenantId)` (gửi x-tenant) → `me()` → điều hướng theo role
- [x] RoleGuard + tab navigation (parent/teacher) qua expo-router
- [ ] **cURL/thiết bị thật**: login PH + GV qua API thật

## 4. Màn theo role (P0 → P1) — port từ mobile-web
- [x] **GV**: home, class-roster, điểm danh, soạn báo cáo, thông báo lớp, notifications
- [x] **PH**: home, con của tôi, chi tiết bé (điểm danh/báo cáo), hóa đơn + VietQR, gửi thuốc, xin nghỉ, notifications
- [x] **Chung**: profile (đổi ngôn ngữ + logout), announcements, medicine list/detail, album (expo-image), thực đơn, giáo án
- [x] P1 một phần: GV duyệt thuốc, lesson-plan
- [x] P1 còn lại: upload ảnh (expo-image-picker → `/media`) — `api/media.ts` + `lib/pickImage.ts` + FormData ở `http.ts`, gắn vào `ReportComposeScreen` (kind REPORT_PHOTO → photoIds). *tsc sạch; smoke thiết bị thật khi tới phase device/EAS.*

## 5. Performance + hoàn thiện
- [x] FlashList cho list dài · expo-image cache · react-query `focusManager`/`onlineManager` theo AppState/NetInfo · New Arch qua build-properties
- [x] Build thử: `expo export --platform web`
- [ ] EAS/dev build (iOS/Android) khi tới devops

## 6. Store-readiness kỹ thuật (P0)
- [x] `app.config.ts`: bundle id/package `vn.kimthanhkids.app`, scheme `kimthanhkids`, version, icon/splash/adaptive icon, camera/photo usage text, privacy manifest khai dữ liệu cơ bản
- [x] `eas.json`: `development`, `preview`, `production` profiles; prod dùng HTTPS placeholder, dev dùng LAN-IP placeholder
- [ ] Cần quyết định trước phase devops/release: Apple Developer Program ($99/năm), Google Play Console ($25), Expo account/projectId thật, Privacy Policy URL, Terms URL, domain/API production HTTPS
- [ ] Chạy `eas build --profile preview` khi có tài khoản Expo/cấu hình signing

## Định nghĩa "Xong" (P0)
- [x] Login (chọn trường) → home đúng role đã implement trên Expo route tree (chưa test thiết bị thật)
- [x] 1 luồng GV (điểm danh) + 1 luồng PH (xem con + hóa đơn) đã implement với API thật
- [x] `tsc` sạch; logic khớp mobile-web (cùng `src/api`)
