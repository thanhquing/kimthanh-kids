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
| TODO | API integration | Replace `src/mockData.ts` with API client calls after tenant mobile-web auth contract is ready. |
| TODO | Auth/session hardening | Add real login, tenant host resolution, token refresh, guarded routes, logout behavior. |
| TODO | Offline queue | Queue attendance/report/medicine actions while offline and replay after reconnect. |
| TODO | Visual regression pass | Compare React screens against `kids-landing/public/mock-ui/mobile/*.html` screen by screen. |
| TODO | E2E smoke tests | Add Playwright flows for parent and teacher happy paths. |
| TODO | Push notification integration | Wire browser notification permission and mobile FCM/web push when backend/mobile phase enables it. |
