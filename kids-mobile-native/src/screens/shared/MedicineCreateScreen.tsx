import { useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { Text } from "react-native";
import { useCreateMedicine } from "@/api/medicine";
import { useMyChildren } from "@/api/students";
import { RoleScreen, TopBar, Card, TextField, PrimaryButton, LoadingState } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

export default function MedicineCreateScreen() {
  const { t } = useT();
  const toast = useToast();
  const children = useMyChildren();
  const mutation = useCreateMedicine();
  const [medicineName, setMedicineName] = useState("");
  const [dosage, setDosage] = useState("");
  const [schedule, setSchedule] = useState("");
  const studentId = children.data?.[0]?.id;
  async function submit() {
    if (!studentId) return;
    try {
      await mutation.mutateAsync({
        studentId,
        medicineName,
        dosage,
        schedule,
        startDate: toDateInputValue(new Date()),
        endDate: toDateInputValue(new Date()),
      });
      toast.show(t("medicine.createSaved"), "success");
    } catch (err) {
      toast.show(errorMessage(err, t), "error");
    }
  }
  return (
    <RoleScreen role="parent">
      <TopBar title={t("medicine.createTitle")} />
      {children.isLoading ? <LoadingState /> : null}
      <Card className="gap-4">
        <Text className="font-semibold text-ink">{children.data?.[0]?.fullName ?? t("medicine.chooseChild")}</Text>
        <TextField label={t("medicine.name")} value={medicineName} onChangeText={setMedicineName} />
        <TextField label={t("medicine.dosage")} value={dosage} onChangeText={setDosage} />
        <TextField label={t("medicine.schedule")} value={schedule} onChangeText={setSchedule} />
        <PrimaryButton disabled={!studentId || !medicineName || !dosage || !schedule} loading={mutation.isPending} onPress={submit}>{t("medicine.createSubmit")}</PrimaryButton>
      </Card>
    </RoleScreen>
  );
}
