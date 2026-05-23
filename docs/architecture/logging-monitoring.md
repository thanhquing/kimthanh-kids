# Logging & Monitoring

## Logging

- Backend uses the Nest logger by default. Production should swap in `nest-winston`
  (already a dependency) writing JSON to stdout for log aggregation.
- All logs include: timestamp, level, context (class), message, optional `requestId`.
- Sensitive fields (`passwordHash`, tokens) are forbidden.

## Request IDs

Add an `X-Request-Id` middleware (TODO) so logs across services can be correlated.

## Metrics (planned)

- `/api/health` (TODO) — liveness/readiness for k8s.
- Prometheus-style `/api/metrics` (TODO) — request count, p95 latency, error rate.

## Tracing (planned)

- OpenTelemetry export to Jaeger/Tempo. Tag spans with `userId`, `schoolId`, `route`.

## Frontend monitoring (planned)

- Sentry or PostHog for web + mobile crashes.
- Web Vitals tracked via `next/web-vitals`.
