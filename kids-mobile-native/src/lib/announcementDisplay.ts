import type { AnnouncementAudience } from "@/api/announcements";
import type { Translator } from "@/i18n";

export const announcementFilters: (AnnouncementAudience | "ALL_VISIBLE")[] = [
  "ALL_VISIBLE",
  "CLASS",
  "PARENTS",
  "TEACHERS",
];

export function announcementAudienceLabel(audience: AnnouncementAudience | "ALL_VISIBLE", t: Translator) {
  const key = {
    ALL_VISIBLE: "announcements.filterAll",
    ALL: "announcements.audienceAll",
    PARENTS: "announcements.audienceParents",
    TEACHERS: "announcements.audienceTeachers",
    CLASS: "announcements.audienceClass",
  }[audience] as Parameters<Translator>[0];
  return t(key);
}
