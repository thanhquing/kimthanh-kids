import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { crm } from "@/api/crm";
import { PageHeader } from "@/components/PageHeader";
import { useT, type TKey } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { GENDER_KEY, guardiansSummary, STUDENT_STATUS } from "@/lib/people";
import { cn, initials } from "@/lib/utils";

/** Khởi tạo viết tắt từ tên lớp: chữ cái đầu của tối đa 2 từ (VD "Lớp Mầm A" → "MA"). */
function classInitials(name: string): string {
  const words = name.trim().split(/\s+/).filter((w) => !/^lớp$/i.test(w));
  return words.slice(-2).map((w) => w[0]).join("").toUpperCase() || "?";
}

type Tab = "students" | "attendance" | "reports" | "announcements";
const TABS: { id: Tab; key: TKey }[] = [
  { id: "students", key: "classrooms.tabStudents" },
  { id: "attendance", key: "classrooms.tabAttendance" },
  { id: "reports", key: "classrooms.tabReports" },
  { id: "announcements", key: "classrooms.tabAnnouncements" },
];

export function ClassroomDetailPage() {
  const { t } = useT();
  const { id = "" } = useParams();
  const [tab, setTab] = useState<Tab>("students");

  const classroom = useQuery({
    queryKey: ["classrooms", id],
    queryFn: () => crm.classrooms.get(id),
    enabled: !!id,
  });
  const roster = useQuery({
    queryKey: ["students", { classroomId: id }],
    queryFn: () => crm.students.list({ classroomId: id }),
    enabled: !!id,
  });

  const c = classroom.data;
  const enrolled = c?._count?.students ?? roster.data?.length ?? 0;
  const free = c ? Math.max(0, c.capacity - enrolled) : 0;

  return (
    <>
      <PageHeader
        title={c?.name ?? t("classrooms.title")}
        section={`${t("classrooms.title")} / ${c?.name ?? "…"}`}
      />
      <main className="p-6">
        <div className="card p-6 mb-5 flex items-center gap-6">
          <div className="w-20 h-20 rounded-2xl brand-grad text-white grid place-items-center text-2xl font-bold shrink-0">
            {c ? classInitials(c.name) : "…"}
          </div>
          <div className="flex-1 min-w-0">
            <div className="text-2xl font-bold truncate">{c?.name ?? "…"}</div>
            <div className="text-sm text-slate-500">
              {[c?.ageGroup, c?.homeroomTeacher && `${t("classrooms.homeroom")} ${c.homeroomTeacher.fullName}`]
                .filter(Boolean)
                .join(" · ") || "—"}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-6 text-center">
            <div>
              <div className="text-2xl font-bold">{enrolled}</div>
              <div className="text-xs text-slate-500">{t("classrooms.statEnrolled")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold">{c?.capacity ?? "—"}</div>
              <div className="text-xs text-slate-500">{t("classrooms.statCapacity")}</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-emerald-600">{free}</div>
              <div className="text-xs text-slate-500">{t("classrooms.statFree")}</div>
            </div>
          </div>
        </div>

        <div className="flex gap-2 mb-4 flex-wrap">
          {TABS.map((tabItem) => (
            <button
              key={tabItem.id}
              className={cn("chip", tab === tabItem.id && "active")}
              onClick={() => setTab(tabItem.id)}
            >
              {t(tabItem.key)}
            </button>
          ))}
        </div>

        {tab !== "students" ? (
          <div className="card p-12 text-center text-sm text-muted">{t("classrooms.comingSoon")}</div>
        ) : roster.isLoading ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : (roster.data ?? []).length === 0 ? (
          <div className="card p-12 text-center text-sm text-muted">{t("classrooms.rosterEmpty")}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th>{t("students.colName")}</th>
                <th>{t("students.colNickname")}</th>
                <th>{t("students.colDob")}</th>
                <th>{t("students.colGender")}</th>
                <th>{t("students.colGuardians")}</th>
                <th>{t("students.fStatus")}</th>
              </tr>
            </thead>
            <tbody>
              {(roster.data ?? []).map((s) => {
                const status = STUDENT_STATUS[s.status];
                return (
                  <tr key={s.id}>
                    <td>
                      <Link
                        to={`/students/${s.id}`}
                        className="flex items-center gap-2 text-[color:var(--primary)] font-semibold"
                      >
                        <div className="avatar !w-8 !h-8 text-xs">{initials(s.fullName)}</div>
                        {s.fullName}
                      </Link>
                    </td>
                    <td>{s.nickname || "—"}</td>
                    <td>{formatDate(s.dateOfBirth)}</td>
                    <td>{t(GENDER_KEY[s.gender])}</td>
                    <td>{guardiansSummary(s.parents) || "—"}</td>
                    <td>
                      <span className={`badge ${status.badge}`}>{t(status.key)}</span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </main>
    </>
  );
}
