import { useState } from "react";
import { Text, View } from "react-native";
import { uploadImage } from "@/api/media";
import { useUpsertDailyReport } from "@/api/reports";
import { useClassrooms, useStudents } from "@/api/students";
import {
  RoleScreen,
  TopBar,
  Card,
  TextField,
  PrimaryButton,
  SoftButton,
  Badge,
  LoadingState,
} from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";
import { pickImageFromLibrary } from "@/lib/pickImage";

export default function ReportComposeScreen() {
  const { t } = useT();
  const toast = useToast();
  const classes = useClassrooms();
  const classroomId = classes.data?.[0]?.id;
  const students = useStudents({ classroomId });
  const studentId = students.data?.[0]?.id;
  const mutation = useUpsertDailyReport();
  const [note, setNote] = useState("");
  const [photoIds, setPhotoIds] = useState<string[]>([]);
  const [uploading, setUploading] = useState(false);

  async function addPhoto() {
    const picked = await pickImageFromLibrary();
    if (!picked) return; // huỷ chọn hoặc từ chối quyền
    setUploading(true);
    try {
      const media = await uploadImage(picked, { kind: "REPORT_PHOTO" });
      setPhotoIds((ids) => [...ids, media.id]);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t("reports.photoUploadError"), "error");
    } finally {
      setUploading(false);
    }
  }

  async function submit() {
    if (!studentId) return;
    try {
      await mutation.mutateAsync({
        studentId,
        date: toDateInputValue(new Date()),
        mood: "HAPPY",
        note,
        photoIds: photoIds.length ? photoIds : undefined,
      });
      toast.show(t("reports.composeSaved", { name: students.data?.[0]?.fullName ?? "" }), "success");
      setNote("");
      setPhotoIds([]);
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t("reports.composeError"), "error");
    }
  }

  return (
    <RoleScreen role="teacher">
      <TopBar title={t("reports.composeTitle")} />
      {classes.isLoading || students.isLoading ? <LoadingState /> : null}
      <Card className="gap-4">
        <Text className="font-semibold text-ink">
          {students.data?.[0]?.fullName ?? t("reports.student")}
        </Text>
        <TextField label={t("reports.note")} value={note} onChangeText={setNote} multiline />
        <View className="flex-row items-center gap-3">
          <SoftButton onPress={addPhoto}>
            {uploading ? t("reports.composeSaving") : t("reports.addPhoto")}
          </SoftButton>
          {photoIds.length > 0 ? (
            <Badge tone="green">{t("reports.photoSelected", { count: photoIds.length })}</Badge>
          ) : null}
        </View>
        <PrimaryButton
          disabled={!studentId || !note || uploading}
          loading={mutation.isPending}
          onPress={submit}
        >
          {t("reports.composeSubmit")}
        </PrimaryButton>
      </Card>
    </RoleScreen>
  );
}
