# Tech Stack Rationale

| Layer | Chosen | Why |
|---|---|---|
| Monorepo | Turborepo + pnpm workspaces | Fast incremental builds; pnpm content-addressable store handles RN + Next together cleanly. |
| Backend | NestJS | Mature DI/decorator model; modular; familiar to backend hires. Easy to add WebSockets/queues later. |
| ORM | Prisma | Best-in-class TS DX; schema as source of truth; migrations battle-tested. |
| DB | PostgreSQL | Rich types (Decimal for money, native JSON, enums), strong ecosystem. |
| Auth | JWT access + rotating refresh | Stateless API, mobile-friendly, no shared session store needed. |
| Web | Next.js 14 App Router | Server Components reduce client JS; built-in i18n routing pairs with next-intl. |
| Web i18n | next-intl | First-class Server Component support, type-safe message keys. |
| Mobile | Expo SDK 51 | OTA updates, simple build/deploy via EAS, large library ecosystem. |
| Mobile nav | React Navigation | Stable, supports nested stacks/tabs role-switching at runtime. |
| Mobile i18n | i18next + expo-localization | Standard combo with device language detection. |
| State (server) | TanStack Query | Cache, retries, mutations — eliminates most Redux boilerplate. |
| State (auth) | Zustand | Tiny, no provider needed; shared across web + mobile via package. |
| Validation | Zod | Same schema usable on backend (validation) and frontend (forms). |
| Styling (web) | TailwindCSS + shadcn primitives (future) | Fast iteration; tokens shared across web + native. |
| Styling (mobile) | NativeWind | Reuse Tailwind mental model; share design tokens. |
| CI | GitHub Actions | Ubiquitous, free for OSS / cheap for private. |
