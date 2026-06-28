import { FileText, Image, Pill } from "lucide-react";
import { useEffect } from "react";
import { useParams } from "react-router-dom";
import { useStudentAttendance } from "@/api/attendance";
import { useAllergies, useIncidents } from "@/api/health";
import { useMyChildren, useStaffStudent, type Student } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, InfoLine, QuickAction, StatusBadge } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { attendanceStatusLabel } from "@/lib/attendanceDisplay";
import { formatShortDate } from "@/lib/date";
import { roleBase } from "@/lib/routes";
import { useMobileState } from "@/lib/mobileState";
import {
  ageFromDate,
  formatDate,
  genderLabel,
  initialsFromName,
  primaryGuardian,
  studentStatusLabel,
} from "@/lib/studentDisplay";

export function StudentDetailPage() {
  const { id } = useParams();
  const { role, setSelectedStudentId } = useMobileState();
  const { t, lang } = useT();
  const isTeacher = role === "teacher";
  const parentChildren = useMyChildren();
  const staffStudent = useStaffStudent(isTeacher ? id : undefined);
  const student = isTeacher
    ? staffStudent.data
    : parentChildren.data?.find((item) => item.id === id);
  const isLoading = isTeacher ? staffStudent.isLoading : parentChildren.isLoading;
  const isError = isTeacher ? staffStudent.isError : parentChildren.isError;
  const base = roleBase(role);
  const backTo = role === "teacher" ? "/teacher/class" : "/parent/children";
  const attendanceQuery = useStudentAttendance(student?.id);
  const latestAttendance = attendanceQuery.data?.[0];
  // Khối sức khỏe chỉ hiển thị cho giáo viên → chỉ fetch khi là teacher (tránh gọi thừa).
  const allergiesQuery = useAllergies(isTeacher ? student?.id : undefined);
  const incidentsQuery = useIncidents(isTeacher ? student?.id : undefined);
  const allergies = allergiesQuery.data ?? [];
  const incidents = incidentsQuery.data ?? [];

  useEffect(() => {
    if (id) setSelectedStudentId(id);
  }, [id, setSelectedStudentId]);

  const guardian = primaryGuardian((student as Student | undefined)?.parents);

  return (
    <>
      <TopBar title={t("students.detailTitle")} backTo={backTo} />
      {isLoading ? <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card mt-3 p-4 text-sm text-red-600">{t("students.detailError")}</div> : null}
      {!isLoading && !isError && !student ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("students.detailEmpty")}</div>
      ) : null}
      {student ? (
        <>
      <div className="mt-3 text-center">
        <Avatar initials={initialsFromName(student.fullName)} image={student.avatarUrl ?? undefined} size="xl" />
        <div className="mt-3 text-lg font-bold">{student.fullName}</div>
        <div className="text-xs text-slate-500">
          {student.classroom?.name ?? t("students.noClass")} · {t("students.age", { age: ageFromDate(student.dateOfBirth) })}
        </div>
      </div>
      <div className="mt-4 grid grid-cols-3 gap-2">
        <QuickAction
          icon={FileText}
          label={t("students.reports")}
          to={role === "teacher" ? "/teacher/reports/new" : "/parent/reports"}
          tone="orange"
        />
        <QuickAction icon={Pill} label={t("students.medicine")} to={`${base}/medicine`} tone="green" />
        <QuickAction icon={Image} label={t("students.album")} to={`${base}/album`} tone="blue" />
      </div>
      <div className="section-title">{t("students.profileSection")}</div>
      <div className="card space-y-3 p-4">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase text-slate-500">{t("students.status")}</span>
          <StatusBadge status={studentStatusLabel(student.status, t)} />
        </div>
        <InfoLine label={t("students.nickname")} value={student.nickname || t("students.noNickname")} />
        <InfoLine label={t("students.dateOfBirth")} value={formatDate(student.dateOfBirth, lang)} />
        <InfoLine label={t("students.gender")} value={genderLabel(student.gender, t)} />
      </div>
      <div className="section-title">{t("attendance.latestSection")}</div>
      <div className="card space-y-3 p-4">
        {attendanceQuery.isLoading ? (
          <div className="text-sm text-slate-500">{t("common.loading")}</div>
        ) : latestAttendance ? (
          <>
            <div className="flex items-center justify-between">
              <span className="text-sm font-semibold">{formatShortDate(latestAttendance.date, lang)}</span>
              <StatusBadge status={attendanceStatusLabel(latestAttendance.status, t)} />
            </div>
            <InfoLine label={t("attendance.note")} value={latestAttendance.note || t("attendance.noNote")} />
          </>
        ) : (
          <div className="text-sm text-slate-500">{t("attendance.studentEmpty")}</div>
        )}
      </div>
      {role === "teacher" ? (
        <>
          <div className="section-title">{t("health.alertSection")}</div>
          <div className="card space-y-3 p-4">
            {allergiesQuery.isLoading || incidentsQuery.isLoading ? (
              <div className="text-sm text-slate-500">{t("common.loading")}</div>
            ) : null}
            {allergies.length ? (
              <InfoLine label={t("health.allergies")} value={allergies.map((item) => item.allergen).join(", ")} />
            ) : (
              <InfoLine label={t("health.allergies")} value={t("health.noAllergies")} />
            )}
            <InfoLine label={t("health.incidents")} value={incidents.length ? t("health.incidentCount", { count: incidents.length }) : t("health.noIncidents")} />
          </div>
        </>
      ) : null}
      <div className="section-title">{t("students.guardianSection")}</div>
      {guardian ? (
        <div className="card flex items-center gap-3 p-3">
          <Avatar initials={initialsFromName(guardian.parent.fullName)} size="md" />
          <div className="flex-1">
            <div className="text-sm font-semibold">{guardian.parent.fullName}</div>
            <div className="text-xs text-slate-500">
              {guardian.relationship} · {guardian.parent.phone ?? guardian.parent.email ?? t("students.noPhone")}
            </div>
          </div>
          {guardian.isPrimary ? <span className="badge b-green">{t("students.primaryGuardian")}</span> : null}
        </div>
      ) : (
        <div className="card p-4 text-sm text-slate-500">{t("students.guardianEmpty")}</div>
      )}
        </>
      ) : null}
    </>
  );
}
