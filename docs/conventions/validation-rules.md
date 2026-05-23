# Validation Rules

## Where

- **Frontend forms**: Zod schemas from `@kimthanh/shared-utils/src/schemas.ts`.
- **Backend bodies**: same schemas via `ZodValidationPipe` (or class-validator DTOs
  for simpler shapes).

The schema is the single source of truth. Frontend and backend share it.

## Standard

- `email` is always lowercased and validated.
- `password` minimum 8 chars, must contain uppercase, lowercase, digit.
- `phone` accepts international (+) and Vietnamese formats.
- `uuid` for all IDs.
- Dates: `z.string().date()` (`YYYY-MM-DD`), datetimes: `z.string().datetime()`.

## Errors

Validation failures return:

```json
{
  "success": false,
  "error": {
    "code": "VALIDATION_FAILED",
    "message": "Validation failed",
    "messageKey": "errors.validation",
    "details": { "fieldErrors": { "email": ["Required"] } }
  }
}
```

UI shows field-level errors from `details.fieldErrors`.
