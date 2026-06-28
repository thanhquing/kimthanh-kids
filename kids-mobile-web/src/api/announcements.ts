import { useMutation, useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type AnnouncementAudience = "ALL" | "PARENTS" | "TEACHERS" | "CLASS";

export type Announcement = {
  id: string;
  schoolId: string;
  audience: AnnouncementAudience;
  classroomId?: string | null;
  title: string;
  body: string;
  publishedAt?: string | null;
  createdAt: string;
  classroom?: { id: string; name: string } | null;
};

export type CreateAnnouncementInput = {
  audience: AnnouncementAudience;
  schoolId?: string;
  classroomId?: string;
  title: string;
  body: string;
  publish?: boolean;
};

export const announcementKeys = {
  all: ["announcements"] as const,
  feed: (role: "parent" | "teacher") => [...announcementKeys.all, "feed", role] as const,
  list: (audience?: AnnouncementAudience) => [...announcementKeys.all, "list", audience] as const,
};

export function listAnnouncements(role: "parent" | "teacher", audience?: AnnouncementAudience) {
  if (role === "parent") return api.get<Announcement[]>("/announcements/feed");
  return api.get<Announcement[]>("/announcements", { query: { audience } });
}

export function createAnnouncement(input: CreateAnnouncementInput) {
  return api.post<Announcement>("/announcements", input);
}

export function useAnnouncements(role: "parent" | "teacher", audience?: AnnouncementAudience) {
  return useQuery({
    queryKey: role === "parent" ? announcementKeys.feed(role) : announcementKeys.list(audience),
    queryFn: () => listAnnouncements(role, audience),
  });
}

export function useCreateAnnouncement() {
  return useMutation({
    mutationFn: createAnnouncement,
  });
}

