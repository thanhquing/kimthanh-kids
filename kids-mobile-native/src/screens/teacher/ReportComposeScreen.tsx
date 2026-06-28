import { useState } from "react";
import { Text } from "react-native";
import { useUpsertDailyReport } from "@/api/reports";
import { useClassrooms, useStudents } from "@/api/students";
import { RoleScreen, TopBar, Card, TextField, PrimaryButton, LoadingState } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

export default function ReportComposeScreen() {
  const { t } = useT();
  const toast = useToast();
  const classes = useClassrooms();
  const classroomId = classes.data?.[0]?.id;
  const students = useStudents({ classroomId });
  const studentId = students.data?.[0]?.id;
  const mutation = useUpsertDailyReport();
  const [note, setNote] = useState("");
  async function submit() {
    if (!studentId) return;
    try {
      await mutation.mutateAsync({ studentId, date: toDateInputValue(new Date()), mood: "HAPPY", note });
      toast.show(t("reports.composeSaved", { name: students.data?.[0]?.fullName ?? "" }), "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t("reports.composeError"), "error");
    }
  }
  return (
    <RoleScreen role="teacher">
      <TopBar title={t("reports.composeTitle")} />
      {classes.isLoading || students.isLoading ? <LoadingState /> : null}
      <Card className="gap-4">
        <Text className="font-semibold text-ink">{students.data?.[0]?.fullName ?? t("reports.student")}</Text>
        <TextField label={t("reports.note")} value={note} onChangeText={setNote} multiline />
        <PrimaryButton disabled={!studentId || !note} loading={mutation.isPending} onPress={submit}>{t("reports.composeSubmit")}</PrimaryButton>
      </Card>
    </RoleScreen>
  );
}
