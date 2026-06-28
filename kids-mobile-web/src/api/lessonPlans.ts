import { useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type Activity = {
  id: string;
  dayOfWeek: number; // 1..7
  startTime?: string | null;
  title: string;
  materials?: string | null;
};

export type LessonPlan = {
  id: string;
  week: string;
  theme: string;
  note?: string | null;
  classroom?: { id: string; name: string } | null;
  activities?: Activity[];
};

export const lessonPlanKeys = {
  all: ["lesson-plans"] as const,
  list: (filters: { classroomId?: string; week?: string }) =>
    [...lessonPlanKeys.all, "list", filters] as const,
  detail: (id?: string) => [...lessonPlanKeys.all, "detail", id] as const,
};

export function listLessonPlans(filters: { classroomId?: string; week?: string } = {}) {
  return api.get<LessonPlan[]>("/lesson-plans", { query: filters });
}

export function getLessonPlan(id: string): Promise<LessonPlan> {
  return api.get<LessonPlan>(`/lesson-plans/${id}`);
}

export function useLessonPlans(filters: { classroomId?: string; week?: string } = {}) {
  return useQuery({
    queryKey: lessonPlanKeys.list(filters),
    queryFn: () => listLessonPlans(filters),
  });
}

export function useLessonPlanDetail(id?: string) {
  return useQuery({
    queryKey: lessonPlanKeys.detail(id),
    queryFn: () => getLessonPlan(id!),
    enabled: !!id,
  });
}
