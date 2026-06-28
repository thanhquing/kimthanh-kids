import { Link } from "expo-router";
import { ClipboardCheck, FileText, Megaphone, School } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useClassrooms } from "@/api/students";
import { RoleScreen, Card, LoadingState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { colors } from "@/theme/colors";

const actions = [
  { href: "/teacher/class", label: "Sĩ số lớp", icon: School },
  { href: "/teacher/attendance", label: "Điểm danh", icon: ClipboardCheck },
  { href: "/teacher/reports/new", label: "Báo cáo", icon: FileText },
  { href: "/teacher/announcements/new", label: "Thông báo", icon: Megaphone },
] as const;

export default function TeacherHomeScreen() {
  const { t } = useT();
  const classrooms = useClassrooms();
  const firstClass = classrooms.data?.[0];

  return (
    <RoleScreen role="teacher">
      <View className="mb-5 rounded-lg bg-primary p-5">
        <Text className="text-sm font-semibold text-white/85">{t("brand.name")}</Text>
        <Text className="mt-1 text-2xl font-bold text-white">{t("nav.home")}</Text>
        <Text className="mt-2 text-sm text-white/85">{firstClass ? firstClass.name : t("students.classroomEmpty")}</Text>
      </View>
      {classrooms.isLoading ? <LoadingState /> : null}
      <View className="flex-row flex-wrap gap-3">
        {actions.map((item) => {
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} asChild>
              <Pressable className="w-[48%] rounded-lg border border-line bg-white p-4">
                <Icon color={colors.primary} size={24} />
                <Text className="mt-3 font-bold text-ink">{item.label}</Text>
              </Pressable>
            </Link>
          );
        })}
      </View>
      <Text className="mb-2 mt-5 text-xs font-bold uppercase text-muted">{t("students.classList")}</Text>
      {(classrooms.data ?? []).slice(0, 3).map((classroom) => (
        <Card key={classroom.id} className="mb-3">
          <Text className="font-bold text-ink">{classroom.name}</Text>
          <Text className="text-sm text-muted">{classroom._count?.students ?? 0} học sinh</Text>
        </Card>
      ))}
    </RoleScreen>
  );
}
