import { CheckSquare, FileText, Megaphone, Pill, School } from "lucide-react";
import { NavLink } from "react-router-dom";
import { useMe } from "@/api/auth";
import { useMedicineList } from "@/api/medicine";
import { useClassrooms } from "@/api/students";
import { GreetingHeader } from "@/components/mobile/MobileShell";
import { QuickAction, TaskCard } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { initialsFromName } from "@/lib/studentDisplay";

export function TeacherHomePage() {
  const { t } = useT();
  const { data: profile } = useMe();
  const { data: classrooms = [] } = useClassrooms();
  const { data: pendingMedicine = [] } = useMedicineList("teacher", "PENDING");

  const name = profile?.fullName ?? "—";
  const homeroom = classrooms[0];

  return (
    <>
      <GreetingHeader greeting={t("home.greetingTeacher")} name={name} initials={initialsFromName(name)} />
      <div className="card brand-grad mt-4 p-4 text-white">
        <div className="text-xs opacity-80">{t("home.myClasses")}</div>
        <div className="mt-1 text-xl font-bold">{homeroom ? homeroom.name : t("home.noClass")}</div>
        {homeroom ? (
          <div className="mt-2 text-sm opacity-90">
            {t("home.studentsCount", { count: homeroom._count?.students ?? 0 })}
          </div>
        ) : null}
      </div>

      <div className="section-title">{t("home.quickAttendance")}</div>
      <div className="grid grid-cols-3 gap-2">
        <QuickAction icon={CheckSquare} label={t("home.quickAttendance")} to="/teacher/attendance" tone="blue" />
        <QuickAction icon={FileText} label={t("home.quickReport")} to="/teacher/reports/new" tone="orange" />
        <QuickAction icon={Megaphone} label={t("home.quickAnnounce")} to="/teacher/announcements/new" tone="green" />
      </div>

      <div className="section-title">{t("home.myClasses")}</div>
      <div className="space-y-2">
        {classrooms.map((classroom) => (
          <NavLink key={classroom.id} to="/teacher/class" className="card flex items-center gap-3 p-3 text-left">
            <div className="grid h-10 w-10 place-items-center rounded-full bg-blue-100 text-blue-600">
              <School className="h-5 w-5" />
            </div>
            <div className="flex-1">
              <div className="text-sm font-semibold">{classroom.name}</div>
              <div className="text-xs text-slate-500">
                {t("home.studentsCount", { count: classroom._count?.students ?? 0 })}
              </div>
            </div>
          </NavLink>
        ))}
      </div>

      <div className="section-title">{t("home.toHandle")}</div>
      {pendingMedicine.length > 0 ? (
        <TaskCard
          icon={Pill}
          title={t("home.pendingMedicine", { count: pendingMedicine.length })}
          sub={pendingMedicine.map((m) => m.medicineName).filter(Boolean).slice(0, 3).join(", ")}
          to="/teacher/medicine/approve"
          tone="blue"
        />
      ) : (
        <div className="card p-4 text-sm text-slate-500">{t("home.noPending")}</div>
      )}
    </>
  );
}
