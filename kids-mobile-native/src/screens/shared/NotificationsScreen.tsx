import { usePathname } from "expo-router";
import { Text } from "react-native";
import { useNotifications } from "@/api/notifications";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import type { Role } from "@/lib/routes";

export default function NotificationsScreen() {
  const pathname = usePathname();
  const role: Role = pathname.startsWith("/teacher") ? "teacher" : "parent";
  const { t } = useT();
  const query = useNotifications();
  return (
    <RoleScreen role={role}>
      <TopBar title={t("nav.announcements")} />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message="Không tải được notifications." /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text="Chưa có notifications." /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-1">
          <Text className="font-bold text-ink">{item.title}</Text>
          <Text className="text-sm text-muted">{item.body}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
