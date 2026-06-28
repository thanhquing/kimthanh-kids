import { Send } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { announcementKeys, useCreateAnnouncement, type AnnouncementAudience } from "@/api/announcements";
import { useClassrooms } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { Field, TextAreaField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { announcementAudienceLabel } from "@/lib/announcementDisplay";
import { cn } from "@/lib/utils";

export function AnnouncementComposePage() {
  const { t } = useT();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [audience, setAudience] = useState<AnnouncementAudience>("CLASS");
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const { data: classrooms = [], isLoading, isError } = useClassrooms();
  const activeClassrooms = useMemo(() => classrooms.filter((classroom) => classroom.isActive), [classrooms]);
  const currentClassroom = activeClassrooms.find((classroom) => classroom.id === classroomId) ?? activeClassrooms[0];
  const createMutation = useCreateAnnouncement();

  useEffect(() => {
    if (!classroomId && activeClassrooms[0]) setClassroomId(activeClassrooms[0].id);
  }, [activeClassrooms, classroomId]);

  async function onSubmit() {
    const schoolId = currentClassroom?.schoolId;
    if (!schoolId || !title.trim() || !body.trim()) return;
    await createMutation.mutateAsync({
      audience,
      schoolId,
      classroomId: audience === "CLASS" ? currentClassroom?.id : undefined,
      title: title.trim(),
      body: body.trim(),
      publish: true,
    });
    // Prefix ["announcements"] cuốn mọi list (CLASS/PARENTS/ALL/undefined) lẫn feed PH + GV.
    await queryClient.invalidateQueries({ queryKey: announcementKeys.all });
    toast(t("announcements.composeSaved"));
  }

  return (
    <>
      <TopBar title={t("announcements.composeTitle")} backTo="/teacher" />
      <div className="card mt-3 space-y-3 p-4">
        {isLoading ? <div className="text-sm text-slate-500">{t("common.loading")}</div> : null}
        {isError ? <div className="text-sm text-red-600">{t("announcements.composeError")}</div> : null}
        <Field label={t("announcements.audience")}>
          <div className="flex gap-2 overflow-x-auto">
            {(["CLASS", "PARENTS", "ALL"] as AnnouncementAudience[]).map((item) => (
              <button
                key={item}
                type="button"
                onClick={() => setAudience(item)}
                className={cn("chip whitespace-nowrap", audience === item && "active")}
              >
                {announcementAudienceLabel(item, t)}
              </button>
            ))}
          </div>
        </Field>
        {audience === "CLASS" ? (
          <Field label={t("announcements.classroom")}>
            <select className="field" value={currentClassroom?.id ?? ""} onChange={(event) => setClassroomId(event.target.value)}>
              {activeClassrooms.map((classroom) => (
                <option key={classroom.id} value={classroom.id}>{classroom.name}</option>
              ))}
            </select>
          </Field>
        ) : null}
        <Field label={t("announcements.subject")}>
          <input className="field" value={title} onChange={(event) => setTitle(event.target.value)} />
        </Field>
        <TextAreaField label={t("announcements.body")} value={body} onChange={setBody} />
        <button
          type="button"
          onClick={onSubmit}
          disabled={!currentClassroom?.schoolId || !title.trim() || !body.trim() || createMutation.isPending}
          className="btn-primary flex w-full items-center justify-center gap-2 disabled:opacity-60"
        >
          <Send className="h-4 w-4" /> {createMutation.isPending ? t("announcements.sending") : t("announcements.send")}
        </button>
      </div>
    </>
  );
}
