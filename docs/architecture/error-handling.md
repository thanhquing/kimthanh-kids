# Error Handling

## Backend

- All exceptions funnel through `AllExceptionsFilter`.
- HTTP exceptions can pass a structured body:

  ```ts
  throw new ConflictException({
    code: 'EMAIL_EXISTS',
    message: 'Email already in use',
    messageKey: 'errors.auth.emailExists',
  });
  ```

- Unknown exceptions → `500 INTERNAL_SERVER_ERROR` with `messageKey: errors.internal`.
- 5xx is logged with stack; 4xx logged at `warn`.
- **Never leak internal details** (SQL fragments, stack traces, env values) to the client.

## Client

- `ApiClient.request` throws `ApiClientError` on `success: false`.
- UI catches and prefers `err.messageKey` over `err.message` for display.
- Generic catch-all in mutations shows a translated `errors.generic` toast.

## React error boundaries

- Web: add an `error.tsx` next to any route that has risky data fetching.
- Mobile: wrap critical screens with a custom `ErrorBoundary` (TODO).
