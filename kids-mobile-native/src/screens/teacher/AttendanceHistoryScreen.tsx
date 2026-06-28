import { Text } from "react-native";
import { useAttendanceByClass } from "@/api/attendance";
import { useClassrooms } from "@/api/students";
import { RoleScreen, TopBar, Card, LoadingState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

export default function AttendanceHistoryScreen() {
  const { t } = useT();
  const date = toDateInputValue(new Date());
  const classes = useClassrooms();
  const classroomId = classes.data?.[0]?.id;
  const query = useAttendanceByClass(classroomId, date);
  return (
    <RoleScreen role="teacher">
      <TopBar title={t("attendance.historyTitle")} />
      {classes.isLoading || query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text={t("attendance.noRecord")} /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3">
          <Text className="font-bold text-ink">{item.student?.fullName ?? item.studentId}</Text>
          <Text className="text-sm text-muted">{item.status}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
