# Known Limitations

Things that look done but aren't. Read before assuming a feature works.

- **Media upload** (`apps/api/src/modules/media/`) is a placeholder. `presignUpload`
  throws `NOT_IMPLEMENTED` until S3-compatible storage is configured (`S3_*` env vars).
- **Refresh-token reuse detection** is not yet implemented. A leaked refresh token is
  single-use (rotated on `/auth/refresh`), but reuse of an already-rotated token only
  triggers `UnauthorizedException`, not session revocation.
- **WebSockets / push notifications**: not yet wired. Announcements/reports require a
  client-side refresh.
- **Pagination cursors**: only offset pagination is implemented. For very large student
  histories, switch to cursor-based pagination.
- **No automated tests yet** outside of jest scaffolding. Add unit tests when touching
  auth, RBAC, or finance.
- **Web auth persistence** uses `localStorage` — acceptable for v1, but consider
  httpOnly cookies for production.
- **Mobile offline support** is not implemented (only the architecture leaves room for
  it via `TanStack Query` caching).
