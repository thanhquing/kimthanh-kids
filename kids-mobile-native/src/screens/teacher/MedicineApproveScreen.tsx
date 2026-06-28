import { Text } from "react-native";
import { useHandleMedicine, useMedicineList } from "@/api/medicine";
import { RoleScreen, TopBar, Card, PrimaryButton, LoadingState, EmptyState } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";

export default function MedicineApproveScreen() {
  const { t } = useT();
  const toast = useToast();
  const query = useMedicineList("teacher", "PENDING");
  const mutation = useHandleMedicine();
  async function approve(id: string) {
    try {
      await mutation.mutateAsync({ id, status: "APPROVED" });
      toast.show(t("medicine.approvedToast"), "success");
      await query.refetch();
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t("medicine.listError"), "error");
    }
  }
  return (
    <RoleScreen role="teacher">
      <TopBar title={t("medicine.approveTitle")} />
      {query.isLoading ? <LoadingState /> : null}
      {!query.isLoading && (query.data ?? []).length === 0 ? <EmptyState text={t("medicine.pendingEmpty")} /> : null}
      {(query.data ?? []).map((item) => (
        <Card key={item.id} className="mb-3 gap-3">
          <Text className="font-bold text-ink">{item.medicineName}</Text>
          <Text className="text-sm text-muted">{item.student?.fullName ?? item.dosage}</Text>
          <PrimaryButton loading={mutation.isPending} onPress={() => approve(item.id)}>{t("medicine.approve")}</PrimaryButton>
        </Card>
      ))}
    </RoleScreen>
  );
}
