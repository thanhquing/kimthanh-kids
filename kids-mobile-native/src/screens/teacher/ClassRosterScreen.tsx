import { Link } from "expo-router";
import { useMemo, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useClassrooms, useStudents, type Student } from "@/api/students";
import { RoleScreen, TopBar, Card, Avatar, LoadingState, ErrorState, EmptyState, SoftButton } from "@/components/ui/Primitives";
import { useT } from "@/i18n";

function StudentRow({ item }: { item: Student }) {
  return (
    <Link href={`/teacher/student/${item.id}`} asChild>
      <Pressable className="mb-3">
        <Card className="flex-row items-center gap-3">
          <Avatar name={item.fullName} uri={item.avatarUrl} />
          <View className="flex-1">
            <Text className="font-bold text-ink">{item.fullName}</Text>
            <Text className="text-sm text-muted">{item.nickname ?? item.classroom?.name ?? "Học sinh"}</Text>
          </View>
        </Card>
      </Pressable>
    </Link>
  );
}

export default function ClassRosterScreen() {
  const { t } = useT();
  const classes = useClassrooms();
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const selected = classroomId ?? classes.data?.[0]?.id;
  const students = useStudents({ classroomId: selected });
  const title = useMemo(() => classes.data?.find((item) => item.id === selected)?.name, [classes.data, selected]);
  const data = students.data ?? [];

  return (
    <RoleScreen role="teacher" scroll={false}>
      <View className="flex-1 px-5 pb-28 pt-4">
        <TopBar title={title ? t("students.rosterTitleWithClass", { name: title }) : t("students.rosterTitle")} />
        <View className="mb-3 flex-row gap-2">
          {(classes.data ?? []).slice(0, 3).map((item) => (
            <SoftButton key={item.id} onPress={() => setClassroomId(item.id)}>{item.name}</SoftButton>
          ))}
        </View>
        {classes.isLoading || students.isLoading ? <LoadingState /> : null}
        {students.isError ? <ErrorState message={t("students.rosterError")} /> : null}
        {!students.isLoading && data.length === 0 ? <EmptyState text={t("students.rosterEmpty")} /> : null}
        <FlashList data={data} keyExtractor={(item) => item.id} renderItem={({ item }) => <StudentRow item={item} />} />
      </View>
    </RoleScreen>
  );
}
