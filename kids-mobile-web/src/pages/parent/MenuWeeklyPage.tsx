import { useMenuDetail, useMenus, type MealType } from "@/api/menus";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine } from "@/components/mobile/Primitives";
import { useT, type TKey } from "@/i18n";
import { formatShortDate } from "@/lib/date";

const MEAL_LABEL: Record<MealType, TKey> = {
  BREAKFAST: "menu.breakfast",
  LUNCH: "menu.lunch",
  SNACK: "menu.snack",
  DINNER: "menu.dinner",
};
const MEAL_ORDER: MealType[] = ["BREAKFAST", "LUNCH", "SNACK", "DINNER"];

export function MenuWeeklyPage() {
  const { t, lang } = useT();
  const { data: menus = [], isError, isLoading } = useMenus();
  const latest = menus[0];
  const { data: menu, isLoading: menuLoading, isError: menuError } = useMenuDetail(latest?.id);

  const meals = menu?.meals ?? [];
  const days = [...new Set(meals.map((m) => m.weekday))].sort((a, b) => a - b);

  return (
    <>
      <TopBar title={t("menu.title")} backTo="/parent" />
      {isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("menu.loadError")}</div> : null}
      {!isLoading && !isError && !latest ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("menu.empty")}</div>
      ) : null}

      {latest ? (
        <div className="card brand-grad mt-3 p-4 text-white">
          <div className="text-xs opacity-80">{t("menu.weekOf", { date: formatShortDate(latest.weekStart, lang) })}</div>
          <div className="mt-1 text-xl font-bold">{latest.classroom?.name ?? t("menu.allSchool")}</div>
        </div>
      ) : null}

      {latest && menuLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {latest && menuError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("menu.loadError")}</div> : null}
      {latest && !menuLoading && !menuError && meals.length === 0 ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("menu.empty")}</div>
      ) : null}

      <div className="mt-3 space-y-2">
        {days.map((weekday) => {
          const dayMeals = meals.filter((m) => m.weekday === weekday);
          return (
            <div key={weekday} className="card p-3">
              <div className="mb-2 text-sm font-semibold">{t(`weekdays.${weekday}` as TKey)}</div>
              {MEAL_ORDER.filter((type) => dayMeals.some((m) => m.mealType === type)).map((type) => (
                <InfoLine
                  key={type}
                  label={t(MEAL_LABEL[type])}
                  value={dayMeals.filter((m) => m.mealType === type).map((m) => m.name).join(", ")}
                />
              ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
