import { useEffect, useMemo, useRef, useState } from "react";
import { Pressable, Text, View } from "react-native";
import { FlashList } from "@shopify/flash-list";
import { useQueryClient } from "@tanstack/react-query";
import { attendanceKeys, useAttendanceByClass, useMarkAttendance, type AttendanceStatus } from "@/api/attendance";
import { useClassrooms, useStudents, type Student } from "@/api/students";
import { RoleScreen, TopBar, Card, LoadingState, ErrorState, EmptyState, PrimaryButton } from "@/components/ui/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { toDateInputValue } from "@/lib/date";

const statuses: AttendanceStatus[] = ["PRESENT", "LATE", "ABSENT", "EXCUSED"];
const NO_STUDENTS: Student[] = [];

function statusLabel(status: AttendanceStatus) {
  return {
    PRESENT: "Có mặt",
    LATE: "Muộn",
    ABSENT: "Vắng",
    EXCUSED: "Phép",
  }[status];
}

function AttendanceRow({
  item,
  status,
  onChange,
}: {
  item: Student;
  status: AttendanceStatus;
  onChange: (id: string, status: AttendanceStatus) => void;
}) {
  return (
    <Card className="mb-3 gap-3">
      <Text className="font-bold text-ink">{item.fullName}</Text>
      <View className="flex-row flex-wrap gap-2">
        {statuses.map((option) => (
          <Pressable
            key={option}
            className={`rounded-full border px-3 py-2 ${status === option ? "border-primary bg-primary" : "border-line bg-white"}`}
            onPress={() => onChange(item.id, option)}
          >
            <Text className={`text-xs font-bold ${status === option ? "text-white" : "text-ink"}`}>{statusLabel(option)}</Text>
          </Pressable>
        ))}
      </View>
    </Card>
  );
}

export default function AttendanceMarkScreen() {
  const { t } = useT();
  const toast = useToast();
  const queryClient = useQueryClient();
  const date = toDateInputValue(new Date());
  const classes = useClassrooms();
  const activeClassrooms = useMemo(() => (classes.data ?? []).filter((classroom) => classroom.isActive), [classes.data]);
  const classroomId = activeClassrooms[0]?.id;
  const students = useStudents({ classroomId });
  const attendance = useAttendanceByClass(classroomId, date);
  const mutation = useMarkAttendance();
  const [draft, setDraft] = useState<Record<string, AttendanceStatus>>({});
  const [notes, setNotes] = useState<Record<string, string>>({});
  const seededKeyRef = useRef<string | null>(null);
  const roster = students.data ?? NO_STUDENTS;
  const entries = useMemo(
    () =>
      roster.map((student) => ({
        studentId: student.id,
        status: draft[student.id] ?? "PRESENT",
        note: notes[student.id]?.trim() || undefined,
      })),
    [draft, notes, roster],
  );

  useEffect(() => {
    if (!classroomId || roster.length === 0 || attendance.isLoading) return;
    const key = `${classroomId}|${date}`;
    if (seededKeyRef.current === key) return;
    const existing = attendance.data ?? [];
    const nextStatuses: Record<string, AttendanceStatus> = {};
    const nextNotes: Record<string, string> = {};
    for (const student of roster) {
      const current = existing.find((item) => item.studentId === student.id);
      nextStatuses[student.id] = current?.status ?? "PRESENT";
      if (current?.note) nextNotes[student.id] = current.note;
    }
    setDraft(nextStatuses);
    setNotes(nextNotes);
    seededKeyRef.current = key;
  }, [attendance.data, attendance.isLoading, classroomId, date, roster]);

  function update(id: string, status: AttendanceStatus) {
    setDraft((current) => ({ ...current, [id]: status }));
  }

  async function save() {
    if (!classroomId) return;
    try {
      const result = await mutation.mutateAsync({ classroomId, date, entries });
      await queryClient.invalidateQueries({ queryKey: attendanceKeys.byClass(classroomId, date) });
      toast.show(t("attendance.saved", { count: result.marked }), "success");
    } catch (err) {
      toast.show(err instanceof Error ? err.message : t("attendance.loadError"), "error");
    }
  }

  return (
    <RoleScreen role="teacher" scroll={false}>
      <View className="flex-1 px-5 pb-44 pt-4">
        <TopBar title={activeClassrooms[0]?.name ? t("attendance.markTitleWithClass", { name: activeClassrooms[0].name }) : t("attendance.markTitle")} />
        {classes.isLoading || students.isLoading || attendance.isLoading ? <LoadingState /> : null}
        {students.isError || attendance.isError ? <ErrorState message={t("attendance.loadError")} /> : null}
        {!students.isLoading && entries.length === 0 ? <EmptyState text={t("attendance.emptyClass")} /> : null}
        <FlashList
          data={roster}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => <AttendanceRow item={item} status={draft[item.id] ?? "PRESENT"} onChange={update} />}
        />
      </View>
      <View className="absolute bottom-24 left-5 right-5">
        <PrimaryButton disabled={!classroomId || entries.length === 0} loading={mutation.isPending} onPress={save}>
          {t("attendance.save", { count: entries.length })}
        </PrimaryButton>
      </View>
    </RoleScreen>
  );
}
