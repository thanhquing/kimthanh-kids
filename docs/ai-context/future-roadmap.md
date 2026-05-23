# Future Roadmap

Non-binding direction. Items here are candidates, not commitments.

## Near-term

- Replace `localStorage` token storage on web with httpOnly cookies.
- Implement S3-presigned media uploads + image resizing.
- Push notifications: Expo push for parents (daily-report ready, new announcement).
- Cursor-based pagination for student history and media feed.

## Mid-term

- WebSocket gateway for live attendance + chat (parent ↔ teacher).
- Audit log table covering all admin/finance write actions.
- Refresh-token reuse detection → revoke entire session family.
- E2E test pipeline (Playwright web, Maestro mobile).

## Long-term

- Multi-campus / multi-tenant superuser console.
- Background jobs (BullMQ) for invoice generation, reminders, exports.
- Analytics warehouse export (BigQuery/Snowflake) for finance reporting.
- GraphQL gateway in front of REST (optional — only if mobile + web need shared subscription model).
