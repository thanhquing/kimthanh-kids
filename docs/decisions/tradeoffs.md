# Trade-offs

## REST over GraphQL

- ✅ Simpler caching, fewer moving parts, smaller mobile bundle.
- ❌ Less ergonomic for ad-hoc queries on mobile. Mitigate with focused endpoints
  and DTOs that include only what the screen needs.

## Single REST API over BFFs per client

- ✅ One source of truth, one SDK.
- ❌ Slight over-fetching on mobile. Acceptable until profile data shows otherwise.

## Prisma over hand-written SQL

- ✅ Strong TS types, migrations, fewer foot-guns.
- ❌ Some complex queries require `$queryRaw`. Acceptable; isolate in repositories
  if/when this grows.

## TailwindCSS / NativeWind

- ✅ Velocity, shared mental model.
- ❌ HTML/JSX can get noisy. Mitigate with primitives in `@kimthanh/shared-ui`.

## Workspace TS source exports (no build step)

- ✅ Fastest DX, no stale dist folders.
- ❌ Slightly slower TS compile vs pre-built `.d.ts`. Re-evaluate if `pnpm typecheck`
  exceeds 30s.

## Bcrypt over Argon2

- ✅ Ubiquitous, stable, well-understood at 10 rounds.
- ❌ Argon2 is the modern choice. Swap in if/when threat model demands.
