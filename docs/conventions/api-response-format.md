# API Response Format

Every endpoint returns `ApiResponse<T>` (see
`packages/shared-types/src/common.ts`).

## Success

```json
{ "success": true, "data": { "...": "..." } }
```

Paginated:

```json
{
  "success": true,
  "data": [ { "...": "..." } ],
  "meta": { "page": 1, "pageSize": 20, "total": 87, "totalPages": 5 }
}
```

Controllers can return either:

- a value `T` → wrapped as `{ success, data: T }`.
- a `Paginated<T>` (`{ items, meta }`) → wrapped as `{ success, data: items, meta }`.

## Error

```json
{
  "success": false,
  "error": {
    "code": "INVALID_CREDENTIALS",
    "message": "Invalid email or password",
    "messageKey": "errors.auth.invalidCredentials"
  }
}
```

`code` values must match the table in `architecture/api-design.md` or be domain-specific
constants (e.g. `EMAIL_EXISTS`). They are stable identifiers — UI may switch on them.

## Localization

`messageKey` is the canonical translation key. UI prefers `t(err.messageKey ?? 'errors.generic')`
over `err.message`.
