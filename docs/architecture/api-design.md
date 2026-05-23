# API Design

## Style

REST + JSON. Base URL: `/api`. Versioning will be added (`/api/v1`) before public release.

## Response envelope

Every endpoint goes through `TransformInterceptor` and returns one of:

```json
// success
{ "success": true, "data": <T>, "meta"?: { "page", "pageSize", "total", "totalPages" } }

// error
{ "success": false, "error": { "code", "message", "messageKey"?, "details"? } }
```

`messageKey` is a translation key (e.g. `errors.auth.invalidCredentials`). UI should
prefer it over `message`.

## Endpoints (snapshot)

| Method | Path | Notes |
|---|---|---|
| POST | `/auth/register` | Public. Returns `LoginResponse`. |
| POST | `/auth/login` | Public. |
| POST | `/auth/refresh` | Public. Body `{ refreshToken }`. Rotates tokens. |
| POST | `/auth/logout` | Authenticated. Revokes all refresh tokens for user. |
| GET  | `/auth/me` | Authenticated. Current user DTO. |
| PATCH| `/users/me` | Authenticated. Update profile. |
| GET  | `/users` | Admin only. Paginated. |
| GET  | `/students` | Authenticated, role-scoped. |
| GET  | `/students/:id` | Authenticated, parent-scoped. |
| GET  | `/students/:id/reports` | Paginated. |
| POST | `/reports` | Teacher/Admin. |
| GET  | `/classrooms` | Tenant-scoped. |
| GET  | `/attendance?classroomId=&date=` | |
| POST | `/attendance` | Teacher/Admin. Upserts by (studentId, date). |
| GET  | `/health/medicine-requests` | |
| POST | `/health/medicine-requests` | Parent/Admin. |
| GET  | `/finance/invoices` | Parent sees own; staff sees tenant. |
| GET  | `/announcements` | Tenant-scoped. |
| POST | `/announcements` | Admin/Teacher. |

## Pagination

Query: `?page=1&pageSize=20&sortBy=createdAt&sortOrder=desc`. Bounded by
`MAX_PAGE_SIZE = 100`.

## Errors

| HTTP | `code` (typical) |
|---|---|
| 400 | `BAD_REQUEST`, `VALIDATION_FAILED` |
| 401 | `UNAUTHORIZED`, `INVALID_CREDENTIALS` |
| 403 | `FORBIDDEN` |
| 404 | `NOT_FOUND` |
| 409 | `CONFLICT`, `EMAIL_EXISTS` |
| 500 | `INTERNAL_SERVER_ERROR` |

## OpenAPI

In development, Swagger UI is served at `/api/docs`.
