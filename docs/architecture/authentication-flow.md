# Authentication Flow

## Tokens

- **Access token**: JWT signed with `JWT_ACCESS_SECRET`, default TTL `15m`.
- **Refresh token**: JWT signed with `JWT_REFRESH_SECRET`, default TTL `30d`.
  Stored server-side as `sha256(token)` in `refresh_tokens` for revocation/rotation.

## Login

```
POST /api/auth/login { email, password }
  → bcrypt.compare(password, passwordHash)
  → issueTokens(user):
      - sign access JWT (15m)
      - sign refresh JWT (30d)
      - insert row in refresh_tokens with sha256(refreshToken)
  → 200 { user, tokens: { accessToken, refreshToken, expiresIn } }
```

The web client stores both in `localStorage` (key prefix `kt.`).
The mobile client stores both in `expo-secure-store`.

## Authenticated request

```
Authorization: Bearer <accessToken>
Accept-Language: vi | en
```

`JwtStrategy` verifies the JWT with `JWT_ACCESS_SECRET` and attaches `RequestUser`
(`{ sub, email, role, schoolId, id }`) to `req.user`.

## Refresh on 401

The shared `ApiClient` interceptor:

1. Sees `401` on a non-retried request.
2. Calls `POST /api/auth/refresh { refreshToken }`.
3. If success → updates stored tokens, retries the original request once.
4. If failure → clears tokens, invokes `onUnauthenticated` (web: redirect to `/login`).

On the server, `/auth/refresh`:

1. Verifies the JWT with `JWT_REFRESH_SECRET`.
2. Looks up `tokenHash = sha256(refreshToken)` in `refresh_tokens`.
3. Rejects if missing, revoked, or expired.
4. Marks the old row `revokedAt = now()`.
5. Issues a brand-new access + refresh pair (full rotation).

## Logout

`POST /api/auth/logout` marks every active refresh token for the user as revoked.
Access tokens cannot be revoked — they simply expire (15m). Acceptable trade-off.

## Multi-device

Each refresh token row tracks `userAgent` and `ipAddress` (future enhancement) so
"sign out of all devices" is `updateMany({ where: { userId }, data: { revokedAt: now } })`.

## What is **not** implemented yet

- Refresh-token-reuse detection (a leaked, already-rotated token should revoke the
  entire session family). See `docs/ai-context/known-limitations.md`.
- Cookie-based auth on web — currently uses `localStorage`.
