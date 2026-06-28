import { Text } from "react-native";
import { useMenus } from "@/api/menus";
import { RoleScreen, TopBar, Card, LoadingState, EmptyState } from "@/components/ui/Primitives";

export default function MenuWeeklyScreen() {
  const query = useMenus();
  return (
    <RoleScreen role="parent">
      <TopBar title="Thực đơn tuần" />
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text="Chưa có thực đơn." /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-2">
          <Text className="font-bold text-ink">{item.weekStart}</Text>
          <Text className="text-sm text-muted">{item.classroom?.name ?? "Toàn trường"}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
