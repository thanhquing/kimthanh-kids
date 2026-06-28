import { useLocalSearchParams, usePathname } from "expo-router";
import { Text } from "react-native";
import { useMedicineDetail } from "@/api/medicine";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import type { Role } from "@/lib/routes";

export default function MedicineDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pathname = usePathname();
  const role: Role = pathname.startsWith("/teacher") ? "teacher" : "parent";
  const { t } = useT();
  const query = useMedicineDetail(id);
  return (
    <RoleScreen role={role}>
      <TopBar title={t("medicine.detailTitle")} />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={t("medicine.detailError")} /> : null}
      {query.data ? (
        <Card className="gap-2">
          <Text className="text-xl font-bold text-ink">{query.data.medicineName}</Text>
          <Text className="text-sm text-muted">{t("medicine.dosage")}: {query.data.dosage}</Text>
          <Text className="text-sm text-muted">{t("medicine.schedule")}: {query.data.schedule}</Text>
          <Text className="text-sm text-muted">{query.data.status}</Text>
        </Card>
      ) : null}
    </RoleScreen>
  );
}
