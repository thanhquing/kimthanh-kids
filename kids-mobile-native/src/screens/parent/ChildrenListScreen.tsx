import { Link } from "expo-router";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useMyChildren, type Student } from "@/api/students";
import { RoleScreen, TopBar, Card, Avatar, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";

function StudentRow({ item }: { item: Student }) {
  return (
    <Link href={`/parent/student/${item.id}`} asChild>
      <Pressable className="mb-3">
        <Card className="flex-row items-center gap-3">
          <Avatar name={item.fullName} uri={item.avatarUrl} />
          <View className="flex-1">
            <Text className="font-bold text-ink">{item.fullName}</Text>
            <Text className="text-sm text-muted">{item.classroom?.name ?? "Chưa phân lớp"}</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function ChildrenListScreen() {
  const { t } = useT();
  const query = useMyChildren();
  const data = query.data ?? [];
  return (
    <RoleScreen role="parent" scroll={false}>
      <View className="flex-1 px-5 pb-28 pt-4">
        <TopBar title={t("students.childrenTitle")} />
        {query.isLoading ? <LoadingState /> : null}
        {query.isError ? <ErrorState message={t("students.childrenError")} /> : null}
        {!query.isLoading && data.length === 0 ? <EmptyState text={t("students.childrenEmpty")} /> : null}
        <FlashList data={data} keyExtractor={(item) => item.id} renderItem={({ item }) => <StudentRow item={item} />} />
      </View>
    </RoleScreen>
  );
}
