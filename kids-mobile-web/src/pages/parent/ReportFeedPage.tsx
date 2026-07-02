import { TopBar } from "@/components/mobile/MobileShell";
import { ReportLine } from "@/components/mobile/Primitives";
import { AuthImage } from "@/components/ui/AuthImage";
import { useT } from "@/i18n";
import { formatShortDate } from "@/lib/date";
import { useMobileState } from "@/lib/mobileState";
import { useMyChildren } from "@/api/students";
import { useStudentReports } from "@/api/reports";
import { moodIcon } from "@/lib/reportDisplay";

export function ReportFeedPage() {
  const { t, lang } = useT();
  const { selectedStudentId } = useMobileState();
  const children = useMyChildren();
  const student = children.data?.find((item) => item.id === selectedStudentId) ?? children.data?.[0];
  const reportsQuery = useStudentReports(student?.id);

  return (
    <>
      <TopBar
        title={student ? t("reports.feedTitleWithName", { name: student.nickname || student.fullName }) : t("reports.feedTitle")}
        backTo={student ? `/parent/student/${student.id}` : "/parent/children"}
      />
      <div className="mt-3 space-y-3">
        {children.isLoading || reportsQuery.isLoading ? (
          <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div>
        ) : null}
        {children.isError || reportsQuery.isError ? (
          <div className="card p-4 text-sm text-red-600">{t("reports.feedError")}</div>
        ) : null}
        {!reportsQuery.isLoading && !reportsQuery.isError && (reportsQuery.data ?? []).length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("reports.feedEmpty")}</div>
        ) : null}
        {(reportsQuery.data ?? []).map((report) => (
          <div key={report.id} className="card p-4">
            <div className="mb-2 flex items-center justify-between">
              <div className="text-sm font-bold">{formatShortDate(report.date, lang)}</div>
              <span className="text-sm font-bold text-blue-600">{moodIcon(report.mood)}</span>
            </div>
            <div className="space-y-1 text-sm">
              <ReportLine label={t("reports.meals")} value={report.meals || t("reports.notUpdated")} />
              <ReportLine label={t("reports.nap")} value={report.nap || t("reports.notUpdated")} />
              <ReportLine label={t("reports.activities")} value={report.activities || t("reports.notUpdated")} />
              {report.note ? <ReportLine label={t("reports.note")} value={report.note} /> : null}
            </div>
            {report.photos?.length ? (
              <div className="mt-3 grid grid-cols-3 gap-2">
                {report.photos.map((photo) => (
                  <AuthImage
                    key={photo.id}
                    mediaId={photo.media.id}
                    alt={t("reports.photoAlt")}
                    className="h-20 w-full rounded-xl object-cover"
                  />
                ))}
              </div>
            ) : null}
          </div>
        ))}
      </div>
    </>
  );
}
