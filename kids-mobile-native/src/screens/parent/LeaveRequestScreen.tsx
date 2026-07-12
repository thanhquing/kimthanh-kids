import { useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { Text } from "react-native";
import { useCreateLeaveRequest } from "@/api/leave";
import { useMyChildren } from "@/api/students";
import { RoleScreen, TopBar, Card, TextField, PrimaryButton, LoadingState } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

export default function LeaveRequestScreen() {
  const { t } = useT();
  const toast = useToast();
  const children = useMyChildren();
  const mutation = useCreateLeaveRequest();
  const [reason, setReason] = useState("");
  const studentId = children.data?.[0]?.id;
  async function submit() {
    if (!studentId) return;
    try {
      await mutation.mutateAsync({
        studentId,
        leaveType: "OTHER",
        startDate: toDateInputValue(new Date()),
        endDate: toDateInputValue(new Date()),
        reason,
      });
      toast.show("Đã gửi đơn xin nghỉ", "success");
      setReason("");
    } catch (err) {
      toast.show(errorMessage(err, t), "error");
    }
  }
  return (
    <RoleScreen role="parent">
      <TopBar title={t("leave.title")} />
      {children.isLoading ? <LoadingState /> : null}
      <Card className="gap-4">
        <Text className="font-semibold text-ink">{children.data?.[0]?.fullName ?? t("leave.chooseChild")}</Text>
        <TextField label={t("leave.reason")} value={reason} onChangeText={setReason} multiline />
        <PrimaryButton disabled={!studentId || !reason} loading={mutation.isPending} onPress={submit}>{t("leave.submit")}</PrimaryButton>
      </Card>
    </RoleScreen>
  );
}
