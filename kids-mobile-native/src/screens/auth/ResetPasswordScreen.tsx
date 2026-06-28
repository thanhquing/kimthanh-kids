import { useRouter } from "expo-router";
import { Screen, Card, PrimaryButton } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { Text } from "react-native";

export default function ResetPasswordScreen() {
  const router = useRouter();
  const { t } = useT();
  return (
    <Screen>
      <Card className="mt-12 gap-4">
        <Text className="text-2xl font-bold text-ink">{t("auth.resetTitle")}</Text>
        <Text className="text-base leading-6 text-muted">{t("auth.resetDesc")}</Text>
        <PrimaryButton onPress={() => router.replace("/login")}>{t("auth.resetBack")}</PrimaryButton>
      </Card>
    </Screen>
  );
}
