import { Link, useLocalSearchParams, usePathname } from "expo-router";
import { useEffect } from "react";
import { Pressable, Text, View } from "react-native";
import { useMyChildren, useStaffStudent } from "@/api/students";
import { useStudentAttendance } from "@/api/attendance";
import { useStudentReports } from "@/api/reports";
import { RoleScreen, TopBar, Card, Avatar, LoadingState, ErrorState, EmptyState } from "@/components/ui/Primitives";
import { useT } from "@/i18n";
import { formatShortDate } from "@/lib/date";
import { useMobileState } from "@/lib/mobileState";
import type { Role } from "@/lib/routes";

export default function StudentDetailScreen() {
  const { id } = useLocalSearchParams<{ id?: string }>();
  const pathname = usePathname();
  const role: Role = pathname.startsWith("/teacher") ? "teacher" : "parent";
  const isTeacher = role === "teacher";
  const { t, lang } = useT();
  const setSelectedStudentId = useMobileState((state) => state.setSelectedStudentId);
  const parentChildren = useMyChildren(!isTeacher);
  const staffStudent = useStaffStudent(isTeacher ? id : undefined);
  const student = isTeacher ? staffStudent.data : parentChildren.data?.find((item) => item.id === id);
  const isLoading = isTeacher ? staffStudent.isLoading : parentChildren.isLoading;
  const isError = isTeacher ? staffStudent.isError : parentChildren.isError;
  const attendance = useStudentAttendance(student?.id);
  const reports = useStudentReports(student?.id);

  useEffect(() => {
    if (id) setSelectedStudentId(id);
  }, [id, setSelectedStudentId]);

  return (
    <RoleScreen role={role}>
      <TopBar title={t("students.detailTitle")} />
      {isLoading ? <LoadingState /> : null}
      {isError ? <ErrorState message={t("students.detailError")} /> : null}
      {!isLoading && !isError && !student ? <EmptyState text={t("students.detailEmpty")} /> : null}
      {student ? (
        <Card className="gap-3">
          <View className="flex-row items-center gap-3">
            <Avatar name={student.fullName} uri={student.avatarUrl} />
            <View className="flex-1">
              <Text className="text-xl font-bold text-ink">{student.fullName}</Text>
              <Text className="text-sm text-muted">{student.classroom?.name ?? t("students.noClass")}</Text>
            </View>
          </View>
          <Text className="text-sm text-muted">{t("students.dateOfBirth")}: {formatShortDate(student.dateOfBirth, lang)}</Text>
          <Text className="text-sm text-muted">{t("students.status")}: {student.status}</Text>
        </Card>
      ) : null}
      <Text className="mb-2 mt-5 text-xs font-bold uppercase text-muted">{t("attendance.latestSection")}</Text>
      {(attendance.data ?? []).slice(0, 3).map((item) => (
        <Card key={item.id} className="mb-3">
          <Text className="font-bold text-ink">{formatShortDate(item.date, lang)}</Text>
          <Text className="text-sm text-muted">{item.status}</Text>
        </Card>
      ))}
      {!attendance.isLoading && (attendance.data ?? []).length === 0 ? <EmptyState text={t("attendance.studentEmpty")} /> : null}
      <Text className="mb-2 mt-5 text-xs font-bold uppercase text-muted">{t("reports.feedTitle")}</Text>
      {(reports.data ?? []).slice(0, 3).map((item) => (
        <Card key={item.id} className="mb-3">
          <Text className="font-bold text-ink">{formatShortDate(item.date, lang)}</Text>
          <Text className="text-sm text-muted">{item.note ?? item.activities ?? t("reports.notUpdated")}</Text>
        </Card>
      ))}
      {role === "parent" ? (
        <Link href="/parent/medicine/new" asChild>
          <Pressable className="mt-2 rounded-md bg-primary px-4 py-3">
            <Text className="text-center font-bold text-white">{t("medicine.createTitle")}</Text>
          </Pressable>
        </Link>
      ) : null}
    </RoleScreen>
  );
}
