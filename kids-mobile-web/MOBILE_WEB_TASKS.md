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
| DONE | API integration | **XONG toàn bộ domain** (chi tiết + cURL ở `API_INTEGRATION_TASKS.md`): auth, students/children, attendance, daily-reports, medicine+health, tuition, leave, announcements+notifications, home (compose), menus, lesson-plans, albums (AuthImage), profile thật. `src/mockData.ts` chỉ còn dùng cho `assets` (ảnh tĩnh). react-query + module `src/api/*` mirror platform. |
| DONE | Auth/session hardening | login thật, tenant theo Host, refresh 401→retry→logout, logout ProfilePage, **`RoleGuard` verify role qua `useMe()` khi reload sâu** (chặn PH↔GV nhầm khu vực), refetch me lúc khởi động. |
| DONE | Auth API verified qua cURL | `POST /auth/login` `{identifier,password}` → `{accessToken,refreshToken,userId}`; `GET /auth/me` → `{id,type,tenantId,platformRole,roles[],allowedSchoolIds}`; `refresh`/`logout`; lỗi `INVALID_CREDENTIALS`/`TENANT_REQUIRED` (401). Test phụ huynh (`0901000001`) + giáo viên (`co.mai@hoasen.edu.vn`), pass cả qua proxy. |
| DONE | Đa ngôn ngữ VI/EN | Mirror kids-crm: `src/lib/language.ts` (`kk_mw_lang`), `src/i18n/{index.ts,vi.json,en.json}` + `useT()`, `initLanguage()`, **`x-language` header đọc theo store**, switcher ở Login/Reset + ProfilePage. Đã i18n hoá **toàn bộ** màn đã integrate. Dict parity **302/302**. |
| DONE | Code review trước Codex | Rà toàn bộ api module + ~24 page: invalidation nhất quán, loading/error/empty đủ, role-gating đúng, quyền API khớp. Không bug nghiêm trọng. Fix nhỏ: `StudentDetailPage` chỉ fetch allergies/incidents khi `isTeacher` (tránh gọi thừa cho PH). Build + dict parity xanh. |
| DONE | Tài liệu kịch bản/định hướng | `FE_TEST_SCENARIOS.md` (chi tiết chức năng từng module → cơ sở e2e FE) + `kids-crm/CRM_FEATURE_IDEAS.md` (ý tưởng CRM tương quan mobile theo role admin/principal/teacher/nurse/finance). |
| TODO | Reset password (DEFER) | kids-api CHƯA có forgot/reset/change-password + chưa có email infra → trang `/reset-password` chỉ hướng dẫn "liên hệ nhà trường". Tài khoản do CRM trường cấp + mật khẩu mặc định (generate theo thuật toán). Bổ sung khi backend có luồng reset. |
| TODO | Offline queue | Queue attendance/report/medicine actions while offline and replay after reconnect. |
| TODO | Visual regression pass | Compare React screens against `kids-landing/public/mock-ui/mobile/*.html` screen by screen. |
| TODO | E2E smoke tests | Add Playwright flows for parent and teacher happy paths — kịch bản chi tiết ở `FE_TEST_SCENARIOS.md`. |
| TODO | Push notification integration | Wire browser notification permission and mobile FCM/web push when backend/mobile phase enables it. |
