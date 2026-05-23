# Architectural Decision Records (ADRs)

Lightweight ADRs. New ADRs are appended; superseded ones are marked, not deleted.

## ADR-001 — Monorepo with Turborepo + pnpm

**Status**: Accepted (2026-05-23)
**Context**: Web, mobile, and API all share types, validation, auth, and design tokens.
**Decision**: Single repo with Turborepo + pnpm workspaces.
**Consequences**: Faster cross-cutting changes; one CI; harder for non-monorepo CI tools.

## ADR-002 — REST (not GraphQL) for v1

**Status**: Accepted (2026-05-23)
**Context**: Two clients (web, mobile) with bounded, well-known queries.
**Decision**: REST with a typed SDK in `shared-api-client`.
**Consequences**: Simpler caching; less query flexibility. Revisit if mobile needs many
specialized projections.

## ADR-003 — JWT access + rotating refresh

**Status**: Accepted (2026-05-23)
**Context**: Mobile needs offline-tolerant sessions; web needs simple auth.
**Decision**: 15-min access JWT + 30-day refresh JWT, rotated on each `/auth/refresh`.
Refresh tokens stored hashed server-side.
**Consequences**: Stateless API; no shared session store needed. Access revocation
requires waiting 15min for expiry (acceptable).

## ADR-004 — i18n via next-intl (web) + i18next (mobile)

**Status**: Accepted (2026-05-23)
**Context**: Default user language is Vietnamese; codebase language is English.
**Decision**: next-intl for web (Server Component support, URL-based locale).
i18next + expo-localization for mobile (device detection, broad ecosystem).
**Consequences**: Two libraries to maintain. Translation JSON keys remain identical
across platforms so writers see one vocabulary.

## ADR-005 — Token storage: localStorage (web) vs SecureStore (mobile)

**Status**: Accepted (2026-05-23). Web side flagged for upgrade.
**Decision**: web uses `localStorage`; mobile uses `expo-secure-store`.
**Consequences**: Web is XSS-vulnerable if any future XSS bug occurs. Migrate web to
httpOnly cookies + CSRF before public release. See `security-best-practices.md`.

## ADR-006 — Multi-tenant by `schoolId`

**Status**: Accepted (2026-05-23)
**Context**: Single deployment, multiple schools.
**Decision**: Every tenant table carries `schoolId`. Services scope queries by
`actor.schoolId`. `SUPER_ADMIN` can cross tenants.
**Consequences**: Simpler than schema-per-tenant; suitable up to thousands of schools.
