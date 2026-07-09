import { Search } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { NavLink } from "react-router-dom";
import { listStudentsPage, studentKeys, useClassrooms } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, Kpi, StatusBadge } from "@/components/mobile/Primitives";
import { LoadMore } from "@/components/ui/LoadMore";
import { useLoadMore } from "@/hooks/useLoadMore";
import { useT } from "@/i18n";
import { initialsFromName, studentStatusLabel } from "@/lib/studentDisplay";

export function ClassRosterPage() {
  const { t } = useT();
  const [classroomId, setClassroomId] = useState<string | undefined>();
  const { data: classrooms = [], isError: classroomsError, isLoading: classroomsLoading } = useClassrooms();
  const activeClassrooms = useMemo(() => classrooms.filter((classroom) => classroom.isActive), [classrooms]);
  const currentClassroom = activeClassrooms.find((classroom) => classroom.id === classroomId) ?? activeClassrooms[0];
  const studentsQuery = useLoadMore(
    studentKeys.list({ classroomId: currentClassroom?.id }),
    (params) => listStudentsPage({ classroomId: currentClassroom?.id }, params),
    { enabled: Boolean(currentClassroom?.id) },
  );
  const students = studentsQuery.items;
  const activeStudents = students.filter((student) => student.status === "ACTIVE").length;
  const needsReview = students.length - activeStudents;

  useEffect(() => {
    if (!classroomId && activeClassrooms[0]) setClassroomId(activeClassrooms[0].id);
  }, [activeClassrooms, classroomId]);

  return (
    <>
      <TopBar title={currentClassroom ? t("students.rosterTitleWithClass", { name: currentClassroom.name }) : t("students.rosterTitle")} rightIcon={Search} />
      {activeClassrooms.length > 1 ? (
        <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
          {activeClassrooms.map((classroom) => (
            <button
              key={classroom.id}
              type="button"
              onClick={() => setClassroomId(classroom.id)}
              className={`chip whitespace-nowrap ${currentClassroom?.id === classroom.id ? "active" : ""}`}
            >
              {classroom.name}
            </button>
          ))}
        </div>
      ) : null}
      <div className="mt-3 grid grid-cols-3 gap-2">
        <Kpi num={String(studentsQuery.total || students.length)} label={t("students.totalStudents")} />
        <Kpi num={String(activeStudents)} label={t("students.activeStudents")} />
        <Kpi num={String(needsReview)} label={t("students.needsReview")} />
      </div>
      <div className="section-title">{t("students.classList")}</div>
      {classroomsLoading || studentsQuery.isLoading ? (
        <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div>
      ) : null}
      {classroomsError || studentsQuery.isError ? (
        <div className="card p-4 text-sm text-red-600">{t("students.rosterError")}</div>
      ) : null}
      {!classroomsLoading && !classroomsError && activeClassrooms.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("students.classroomEmpty")}</div>
      ) : null}
      {!studentsQuery.isLoading && !studentsQuery.isError && currentClassroom && students.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("students.rosterEmpty")}</div>
      ) : null}
      <div className="space-y-2">
        {students.map((student) => (
          <NavLink key={student.id} to={`/teacher/student/${student.id}`} className="card flex items-center gap-3 p-3 text-left">
            <Avatar initials={initialsFromName(student.fullName)} image={student.avatarUrl ?? undefined} size="md" />
            <div className="flex-1">
              <div className="text-sm font-semibold">{student.fullName}</div>
              <div className="text-xs text-slate-500">{student.nickname || student.classroom?.name || t("students.noNickname")}</div>
            </div>
            <StatusBadge status={studentStatusLabel(student.status, t)} />
          </NavLink>
        ))}
      </div>
      <LoadMore
        hasMore={!!studentsQuery.hasNextPage}
        loading={studentsQuery.isFetchingNextPage}
        onMore={() => void studentsQuery.fetchNextPage()}
      />
      <div className="mt-4 grid grid-cols-2 gap-2">
        <NavLink to="/teacher/lesson-plan" className="btn-soft text-center">{t("students.lessonPlan")}</NavLink>
        <NavLink to="/teacher/medicine/approve" className="btn-soft text-center">{t("students.approveMedicine")}</NavLink>
      </div>
    </>
  );
}
