# kids-mobile-native

App di động native (iOS/Android) cho phụ huynh & giáo viên KimThanh Kids — **Expo (React Native)**.

> 🚧 **Chưa khởi tạo source.** Thư mục hiện chỉ có README để Git theo dõi.

## Chiến lược: copy-first từ `kids-mobile-web`

Quyết định kiến trúc (D5, [`../kids-tasks/PHASE_UI_TASKS.md`](../kids-tasks/PHASE_UI_TASKS.md)): **2 codebase tách, chia sẻ logic bằng copy**, KHÔNG hợp nhất 1 codebase Expo + web-export.

- **Copy gần nguyên xi** từ `kids-mobile-web`: `src/api/*` (types + react-query hooks + `public.ts`), `src/i18n/*` (vi/en + `useT`), `src/lib/*` (display helpers, date, routes).
- **Chỉ sửa lớp biên (adapter):**
  - `api/http.ts`: token/lang/tenant store dùng `expo-secure-store` (token) + `AsyncStorage` (lang/tenant) thay `localStorage`; `baseURL` cấu hình thay Vite proxy; vẫn gắn header **`x-tenant`** + `x-language` + refresh 401.
  - `lib/language.ts`: đổi backing store (giữ `subscribe`/`useSyncExternalStore`).
- **Viết lại UI** bằng RN: `View/Text/Pressable`, **NativeWind** (giữ class Tailwind), **expo-router** (mirror route), **expo-image** (ảnh media kèm header Bearer), **FlashList** cho list dài.
- **Đồng bộ:** đổi logic ở `kids-mobile-web` → diff cơ học sang đây (cùng cấu trúc/tên file).

## Đăng nhập (độc lập subdomain)

Giống mobile-web: màn login có **dropdown chọn trường** (`GET /public/tenants`, hiện list để chọn — tìm là phụ) → lưu `tenantId` → gửi header **`x-tenant`** khi login. Sau login token mang `tenantId` nên request sau tự scope. Chi tiết: [`../kids-documentation/MULTI_TENANCY.md`](../kids-documentation/MULTI_TENANCY.md).

## Performance (khác bản web)

FlashList virtualization cho roster/feed · expo-image cache · Hermes · react-query `focusManager`/`onlineManager` theo `AppState` · giữ kỷ luật re-render (memo context, ref ổn định).

## Khi khởi tạo

- `.gitignore`: `node_modules`, `.expo`, `dist`, `.env`.
- Lập checklist ở `../kids-tasks/PHASE_MOBILE_NATIVE_TASKS.md` trước khi scaffold.
- Flow nghiệp vụ P0/P1 (GV + PH): xem [`../kids-tasks/PHASE_UI_TASKS.md`](../kids-tasks/PHASE_UI_TASKS.md) §6 + [`../kids-mobile-web/FE_TEST_SCENARIOS.md`](../kids-mobile-web/FE_TEST_SCENARIOS.md).
