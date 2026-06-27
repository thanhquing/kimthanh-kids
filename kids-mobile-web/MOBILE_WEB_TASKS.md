# kids-mobile-web task handoff

Status legend: TODO / PROGRESS / DONE.

| Status | Work item | Notes |
| --- | --- | --- |
| DONE | Scaffold React/Vite/Tailwind app | Stack aligned with `kids-platform`; app runs independently in `kids-mobile-web`. |
| DONE | Add SPA/PWA shell | Added manifest, production service worker, mobile viewport/safe-area handling. |
| DONE | Copy mock assets | `logo.png` and `mock-ui/images/*` copied into `public/mock-ui`. |
| DONE | Port mock UI design tokens | CSS keeps `phone`, `phone-body`, `phone-tabbar`, `card`, `badge`, `chip`, `field`, `brand-grad`, `hero-img`. |
| DONE | Parent role UI | Login, home, children, student detail, reports, announcements, medicine, invoices, payment, menu, leave request, album, notifications, profile. |
| DONE | Teacher role UI | Home, class roster, attendance marking, report compose, announcement compose, medicine approval, lesson plan, notifications, profile. |
| DONE | Mock behavior without API | Role switch, tab navigation, attendance state, toast feedback, bottom sheets/popups for payment, medicine, attendance notes, leave confirmation, push settings. |
| DONE | Refactor theo convention kids-platform | `App.tsx` dùng `Routes`; common state ở `src/lib`; common UI ở `src/components/ui`; mobile primitives/layout ở `src/components/mobile`; màn hình tách vào `src/pages/{auth,parent,teacher,shared}`. |
| DONE | Add shadcn-style utilities | Added `cn` helper using `clsx` + `tailwind-merge`; common Field/Toast/BottomSheet components reuse Tailwind token classes. |
| DONE | Cover full role-prefixed mobile routes | Public routes are `/login` and `/reset-password`; parent pages live under `/parent/*`; teacher pages live under `/teacher/*`. Added pages for Login, Reset Password, Parent Home, Teacher Home, Children, Student Detail, Attendance, Attendance History, Report Compose, Report Feed, Medicine List/Create/Detail/Approve, Invoices, Payment, Announcements, Announcement Compose, Profile, Notifications, Menu Weekly, Leave Request, Class Roster, Lesson Plan, Album Gallery. |
| DONE | Root scripts | Added `dev:mobile-web`, `build:mobile-web`, `install:mobile-web`; fixed `build:mobile-web` to target this app. |
| PROGRESS | API integration | **Auth XONG** (`src/api/http.ts` copy file mẫu platform + `src/api/auth.ts`): login bằng SĐT/email → `me` → route theo `roles[]`. Các domain còn lại (students/attendance/reports/medicine/invoices...) vẫn dùng `src/mockData.ts` — integrate tiếp theo từng nhóm. |
| PROGRESS | Auth/session hardening | XONG: login thật, tenant resolve theo Host (Vite proxy `demo.kimthanhkids.vn`), refresh 1 lần khi 401 → retry → logout, `RequireAuth` guard `/parent` & `/teacher`, logout ở ProfilePage. Còn lại: persist + verify role khi reload sâu (hiện guard chỉ check có token). |
| DONE | Auth API verified qua cURL | `POST /auth/login` `{identifier,password}` → `{accessToken,refreshToken,userId}`; `GET /auth/me` → `{id,type,tenantId,platformRole,roles[],allowedSchoolIds}`; `refresh`/`logout`; lỗi `INVALID_CREDENTIALS`/`TENANT_REQUIRED` (401). Test phụ huynh (`0901000001`) + giáo viên (`co.mai@hoasen.edu.vn`), pass cả qua proxy. |
| PROGRESS | Đa ngôn ngữ VI/EN | Hạ tầng XONG (mirror kids-crm): `src/lib/language.ts` (`kk_mw_lang`), `src/i18n/{index.ts,vi.json,en.json}` + `useT()`, `initLanguage()` ở main, **`x-language` header trong `http.ts` đọc theo store**, switcher ở ProfilePage. Đã migrate: Login, ResetPassword, tab bar (nav.*), Profile. Còn lại: ~20 màn parent/teacher/shared chưa rút chuỗi ra dict (migrate theo đợt). Dict parity 37/37. |
| TODO | Reset password (DEFER) | kids-api CHƯA có forgot/reset/change-password + chưa có email infra → trang `/reset-password` chỉ hướng dẫn "liên hệ nhà trường". Tài khoản do CRM trường cấp + mật khẩu mặc định (generate theo thuật toán). Bổ sung khi backend có luồng reset. |
| TODO | Offline queue | Queue attendance/report/medicine actions while offline and replay after reconnect. |
| TODO | Visual regression pass | Compare React screens against `kids-landing/public/mock-ui/mobile/*.html` screen by screen. |
| TODO | E2E smoke tests | Add Playwright flows for parent and teacher happy paths. |
| TODO | Push notification integration | Wire browser notification permission and mobile FCM/web push when backend/mobile phase enables it. |
