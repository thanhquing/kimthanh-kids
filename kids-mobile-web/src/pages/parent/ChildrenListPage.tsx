import { ChevronRight, Search } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useMyChildren } from "@/api/students";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { ageFromDate, initialsFromName } from "@/lib/studentDisplay";

export function ChildrenListPage() {
  const { t } = useT();
  const { data: children = [], isError, isLoading } = useMyChildren();

  return (
    <>
      <TopBar title={t("students.childrenTitle")} rightIcon={Search} />
      <div className="mt-3 space-y-3">
        {isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
        {isError ? <div className="card p-4 text-sm text-red-600">{t("students.childrenError")}</div> : null}
        {!isLoading && !isError && children.length === 0 ? (
          <div className="card p-4 text-sm text-slate-500">{t("students.childrenEmpty")}</div>
        ) : null}
        {children.map((student) => (
          <NavLink
            key={student.id}
            to={`/parent/student/${student.id}`}
            className="card flex items-center gap-3 p-3 text-left"
          >
            <Avatar initials={initialsFromName(student.fullName)} image={student.avatarUrl ?? undefined} size="lg" />
            <div className="flex-1">
              <div className="font-semibold">{student.fullName}</div>
              <div className="text-xs text-slate-500">
                {student.classroom?.name ?? t("students.noClass")} · {t("students.age", { age: ageFromDate(student.dateOfBirth) })}
              </div>
            </div>
            <ChevronRight className="h-5 w-5 text-slate-400" />
          </NavLink>
        ))}
      </div>
    </>
  );
}
