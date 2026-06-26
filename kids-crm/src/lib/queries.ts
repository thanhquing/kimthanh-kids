import type { QueryClient } from "@tanstack/react-query";

/**
 * Invalidate các nhóm dữ liệu CRM có liên quan chéo sau mutation.
 */
export function invalidateCrmData(qc: QueryClient) {
  for (const key of [
    "crm-dashboard",
    "crm-settings",
    "classrooms",
    "students",
    "members",
    "attendance",
    "tuition-invoices",
    "announcements",
    "audit-logs",
  ]) {
    qc.invalidateQueries({ queryKey: [key] });
  }
}
