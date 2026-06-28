import { Text } from "react-native";
import { useLessonPlans } from "@/api/lessonPlans";
import { RoleScreen, TopBar, Card, LoadingState, EmptyState } from "@/components/ui/Primitives";

export default function LessonPlanScreen() {
  const query = useLessonPlans();
  return (
    <RoleScreen role="teacher">
      <TopBar title="Giáo án tuần" />
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text="Chưa có giáo án." /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-2">
          <Text className="font-bold text-ink">{item.theme}</Text>
          <Text className="text-sm text-muted">{item.week}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
