import { useRouter } from "expo-router";
import { Globe2, LogOut } from "lucide-react-native";
import { Pressable, Text, View } from "react-native";
import { useQueryClient } from "@tanstack/react-query";
import { logout, roleForMobile, useMe } from "@/api/auth";
import { RoleScreen, Card, LoadingState, ErrorState } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { languageStore } from "@/lib/language";
import { colors } from "@/theme/colors";

export default function ProfileScreen() {
  const { t, lang } = useT();
  const { data, isLoading, isError } = useMe();
  const router = useRouter();
  const toast = useToast();
  const queryClient = useQueryClient();
  const role = roleForMobile(data?.roles ?? []) ?? "parent";

  async function doLogout() {
    await logout();
    queryClient.clear();
    toast.show(t("profile.logout"));
    router.replace("/login");
  }

  return (
    <RoleScreen role={role}>
      <Text className="mb-4 text-2xl font-bold text-ink">{t("profile.title")}</Text>
      {isLoading ? <LoadingState /> : null}
      {isError ? <ErrorState message="Không tải được hồ sơ." /> : null}
      {data ? (
        <Card className="gap-3">
          <Text className="text-xl font-bold text-ink">{data.fullName ?? data.phone}</Text>
          <Text className="text-sm text-muted">{role === "teacher" ? t("profile.roleTeacher") : t("profile.roleParent")}</Text>
          <View className="h-px bg-line" />
          <Text className="text-sm text-muted">{t("profile.phone")}</Text>
          <Text className="font-semibold text-ink">{data.phone ?? "-"}</Text>
        </Card>
      ) : null}
      <Card className="mt-4 gap-3">
        <Pressable className="flex-row items-center justify-between py-2" onPress={() => languageStore.toggle()}>
          <View className="flex-row items-center gap-3">
            <Globe2 color={colors.primary} size={20} />
            <Text className="font-semibold text-ink">{t("profile.language")}</Text>
          </View>
          <Text className="font-bold text-primary">{lang.toUpperCase()}</Text>
        </Pressable>
        <Pressable className="flex-row items-center gap-3 py-2" onPress={doLogout}>
          <LogOut color={colors.danger} size={20} />
          <Text className="font-semibold text-danger">{t("profile.logout")}</Text>
        </Pressable>
      </Card>
    </RoleScreen>
  );
}
