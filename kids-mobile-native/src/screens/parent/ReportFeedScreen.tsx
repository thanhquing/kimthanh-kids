import { Text } from "react-native";
import { useMyChildren } from "@/api/students";
import { useStudentReports } from "@/api/reports";
import { RoleScreen, TopBar, Card, LoadingState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { formatShortDate } from "@/lib/date";

export default function ReportFeedScreen() {
  const { t, lang } = useT();
  const children = useMyChildren();
  const studentId = children.data?.[0]?.id;
  const reports = useStudentReports(studentId);
  return (
    <RoleScreen role="parent">
      <TopBar title={t("reports.feedTitle")} />
      {children.isLoading || reports.isLoading ? <LoadingState /> : null}
      {!reports.isLoading && (reports.data ?? []).length === 0 ? <EmptyState text={t("reports.feedEmpty")} /> : null}
      {(reports.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-2">
          <Text className="font-bold text-ink">{formatShortDate(item.date, lang)}</Text>
          <Text className="text-sm text-muted">{item.activities ?? t("reports.notUpdated")}</Text>
          <Text className="text-sm text-muted">{item.note ?? ""}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
