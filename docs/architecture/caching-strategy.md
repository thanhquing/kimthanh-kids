# Caching Strategy

## Client (TanStack Query)

- `staleTime: 60_000` default.
- Disable `refetchOnWindowFocus` for kindergarten dashboards (low real-time need).
- Invalidate by exact key after mutations.

## API

- HTTP caching is **not** used for authenticated endpoints — JWT bearers + Vary headers
  make CDN caching error-prone. Treat all `/api/*` responses as `Cache-Control: no-store`.
- Static marketing pages on `apps/web` are eligible for ISR (`revalidate: 600`).

## Database

- Prisma reuses a single connection pool. Set `connection_limit` via `DATABASE_URL`.
- Long-running reports (future analytics) should hit a read replica or a warehouse.

## Future

- Redis for: refresh-token blacklist hot path, push-notification idempotency,
  rate-limiting buckets (currently in-memory via NestJS Throttler).
