import { Link, usePathname } from "expo-router";
import { Pressable, Text } from "react-native";
import { useMedicineList } from "@/api/medicine";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import type { Role } from "@/lib/routes";

export default function MedicineListScreen() {
  const pathname = usePathname();
  const role: Role = pathname.startsWith("/teacher") ? "teacher" : "parent";
  const { t } = useT();
  const query = useMedicineList(role);
  return (
    <RoleScreen role={role}>
      <TopBar title={t("medicine.title")} />
      {query.isLoading ? <LoadingState /> : null}
      {query.isError ? <ErrorState message={t("medicine.listError")} /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text={t("medicine.listEmpty")} /> : null}
      {(query.data ?? []).map((item) => (
        <Link key={item.id} href={`/${role}/medicine/${item.id}`} asChild>
          <Pressable>
            <Card className="mb-3 gap-1">
              <Text className="font-bold text-ink">{item.medicineName}</Text>
              <Text className="text-sm text-muted">{item.student?.fullName ?? item.dosage}</Text>
              <Text className="text-xs font-bold text-primary">{item.status}</Text>
            </Card>
          </Pressable>
        </Link>
      ))}
    </RoleScreen>
  );
}
