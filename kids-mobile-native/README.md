# kids-mobile-native

App di động native (iOS/Android) cho phụ huynh & giáo viên KimThanh Kids — **Expo (React Native)**.

> ✅ **Đã khởi tạo Expo SDK 56** với expo-router, NativeWind, React Query, SecureStore/MMKV, FlashList, EAS config và store-readiness metadata nền tảng.

## Chiến lược: copy-first từ `kids-mobile-web`

Quyết định kiến trúc đã chốt: **2 codebase tách, chia sẻ logic bằng copy**, KHÔNG hợp nhất 1 codebase Expo + web-export. Xem kiến thức DONE ở [`../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md`](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md).

- **Copy gần nguyên xi** từ `kids-mobile-web`: `src/api/*` (types + react-query hooks + `public.ts`), `src/i18n/*` (vi/en + `useT`), `src/lib/*` (display helpers, date, routes).
- **Chỉ sửa lớp biên (adapter):**
  - `api/http.ts`: token store dùng `expo-secure-store`; lang/tenant dùng `react-native-mmkv` thay `localStorage`; `baseURL=EXPO_PUBLIC_API_URL`; vẫn gắn header **`x-tenant`** + `x-language` + refresh 401.
  - `lib/language.ts`: đổi backing store (giữ `subscribe`/`useSyncExternalStore`).
- **Viết lại UI** bằng RN: `View/Text/Pressable`, **NativeWind** (giữ class Tailwind), **expo-router** (mirror route), **expo-image** (ảnh media kèm header Bearer), **FlashList** cho list dài.
- **Feature-gating UX:** route wrapper đọc `/auth/me.features` để chặn Album (`media_gallery`) và Giáo án (`lesson_plan`) trước khi API trả 403, khớp mobile-web.
- **Copy lỗi ổn định theo `error.code`:** `src/lib/errorMessage.ts` map code → i18n (namespace `errors` VI/EN) thay vì raw `error.message`; login map `INVALID_CREDENTIALS`/`ACCOUNT_LOCKED`/`TENANT_REQUIRED` (copy nguyên từ mobile-web).
- **Đồng bộ:** đổi logic ở `kids-mobile-web` → diff cơ học sang đây (cùng cấu trúc/tên file).

## Đăng nhập (độc lập subdomain)

Giống mobile-web: màn login có **dropdown chọn trường** (`GET /public/tenants`, hiện list để chọn — tìm là phụ) → lưu `tenantId` → gửi header **`x-tenant`** khi login. Sau login token mang `tenantId` nên request sau tự scope. Chi tiết: [`../kids-documentation/MULTI_TENANCY.md`](../kids-documentation/MULTI_TENANCY.md).

## Performance (khác bản web)

FlashList virtualization cho roster/feed · expo-image cache · Hermes · react-query `focusManager`/`onlineManager` theo `AppState` · giữ kỷ luật re-render (memo context, ref ổn định).

## Khi khởi tạo

- `.gitignore`: `node_modules`, `.expo`, `dist`, `.env`, `ios/`, `android/`.
- Flow nghiệp vụ P0/P1 (GV + PH): xem [`../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md`](../kids-documentation/IMPLEMENTATION_KNOWLEDGE.md) + [`../kids-mobile-web/FE_TEST_SCENARIOS.md`](../kids-mobile-web/FE_TEST_SCENARIOS.md). Việc còn lại nằm ở [`../kids-tasks/BACKLOG.md`](../kids-tasks/BACKLOG.md).

## Chạy local

```bash
cd kids-mobile-native
export EXPO_PUBLIC_API_URL=http://<LAN-IP>:3000/api
pnpm start
pnpm typecheck
```

Điện thoại thật không hiểu `localhost`; dùng LAN IP của máy chạy `kids-api`.

## Store-readiness

- `app.config.ts`: `vn.kimthanhkids.app`, scheme `kimthanhkids`, New Architecture qua `expo-build-properties`, icon/splash/adaptive icon, mô tả quyền camera/photo, privacy manifest.
- `eas.json`: `development`, `preview`, `production`; production trỏ HTTPS placeholder, không hardcode LAN IP.
- Còn cần ở phase devops/release: Apple Developer Program, Google Play Console, Expo projectId thật, Privacy Policy URL, Terms URL, signing/build thật.
