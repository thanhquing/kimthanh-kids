import { usePathname } from "expo-router";
import { Text } from "react-native";
import { useAnnouncements } from "@/api/announcements";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import type { Role } from "@/lib/routes";

export default function AnnouncementsScreen() {
  const pathname = usePathname();
  const role: Role = pathname.startsWith("/teacher") ? "teacher" : "parent";
  const { t } = useT();
  const query = useAnnouncements(role);
  return (
    <RoleScreen role={role}>
      <TopBar title={t("nav.announcements")} />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message="Không tải được thông báo." /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text="Chưa có thông báo." /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-2">
          <Text className="font-bold text-ink">{item.title}</Text>
          <Text className="text-sm leading-5 text-muted">{item.body}</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
