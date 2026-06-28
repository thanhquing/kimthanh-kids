import { useLessonPlanDetail, useLessonPlans } from "@/api/lessonPlans";
import { TopBar } from "@/components/mobile/MobileShell";
import { useT, type TKey } from "@/i18n";

export function LessonPlanPage() {
  const { t } = useT();
  const { data: plans = [], isError, isLoading } = useLessonPlans();
  const latest = plans[0];
  const { data: plan, isLoading: planLoading, isError: planError } = useLessonPlanDetail(latest?.id);

  const activities = plan?.activities ?? [];

  return (
    <>
      <TopBar title={t("lessonPlan.title")} backTo="/teacher/class" />
      {isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("lessonPlan.loadError")}</div> : null}
      {!isLoading && !isError && !latest ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("lessonPlan.empty")}</div>
      ) : null}

      {latest ? (
        <div className="card brand-grad mt-3 p-4 text-white">
          <div className="text-xs opacity-80">{t("lessonPlan.week", { week: latest.week })}</div>
          <div className="mt-1 text-xl font-bold">{latest.theme}</div>
          {latest.classroom?.name ? <div className="mt-1 text-sm opacity-90">{latest.classroom.name}</div> : null}
        </div>
      ) : null}

      {latest ? (
        <div className="mt-3 space-y-2">
          {planLoading ? (
            <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div>
          ) : planError ? (
            <div className="card p-4 text-sm text-red-600">{t("lessonPlan.loadError")}</div>
          ) : activities.length === 0 ? (
            <div className="card p-4 text-sm text-slate-500">{t("lessonPlan.noActivities")}</div>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="card p-3">
                <div className="flex items-center justify-between">
                  <div className="text-sm font-semibold">{activity.title}</div>
                  <span className="badge b-green">{t(`weekdays.${activity.dayOfWeek}` as TKey)}</span>
                </div>
                {activity.startTime || activity.materials ? (
                  <div className="mt-1 text-xs text-slate-500">
                    {[activity.startTime, activity.materials].filter(Boolean).join(" · ")}
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      ) : null}
    </>
  );
}
