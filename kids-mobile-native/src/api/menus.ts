import { useQuery } from "@tanstack/react-query";
import { api } from "./http";

export type MealType = "BREAKFAST" | "LUNCH" | "SNACK" | "DINNER";

export type Meal = {
  id: string;
  weekday: number; // 1=Thứ 2 … 7=CN
  mealType: MealType;
  name: string;
  ingredients?: string | null;
};

export type WeeklyMenu = {
  id: string;
  weekStart: string;
  note?: string | null;
  classroom?: { id: string; name: string } | null;
  meals?: Meal[];
};

export const menuKeys = {
  all: ["menus"] as const,
  list: (filters: { weekStart?: string; classroomId?: string }) =>
    [...menuKeys.all, "list", filters] as const,
  detail: (id?: string) => [...menuKeys.all, "detail", id] as const,
};

export function listMenus(filters: { weekStart?: string; classroomId?: string } = {}) {
  return api.get<WeeklyMenu[]>("/menus", { query: filters });
}

export function getMenu(id: string): Promise<WeeklyMenu> {
  return api.get<WeeklyMenu>(`/menus/${id}`);
}

export function useMenus(filters: { weekStart?: string; classroomId?: string } = {}) {
  return useQuery({ queryKey: menuKeys.list(filters), queryFn: () => listMenus(filters) });
}

export function useMenuDetail(id?: string) {
  return useQuery({
    queryKey: menuKeys.detail(id),
    queryFn: () => getMenu(id!),
    enabled: !!id,
  });
}
