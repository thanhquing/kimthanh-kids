import { useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { useCreateAnnouncement } from "@/api/announcements";
import { RoleScreen, TopBar, Card, TextField, PrimaryButton } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";

export default function AnnouncementComposeScreen() {
  const toast = useToast();
  const { t } = useT();
  const mutation = useCreateAnnouncement();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  async function submit() {
    try {
      await mutation.mutateAsync({ title, body, audience: "PARENTS" });
      toast.show("Đã gửi thông báo", "success");
      setTitle("");
      setBody("");
    } catch (err) {
      toast.show(errorMessage(err, t), "error");
    }
  }
  return (
    <RoleScreen role="teacher">
      <TopBar title="Soạn thông báo" />
      <Card className="gap-4">
        <TextField label="Tiêu đề" value={title} onChangeText={setTitle} />
        <TextField label="Nội dung" value={body} onChangeText={setBody} multiline />
        <PrimaryButton disabled={!title || !body} loading={mutation.isPending} onPress={submit}>Gửi thông báo</PrimaryButton>
      </Card>
    </RoleScreen>
  );
}
