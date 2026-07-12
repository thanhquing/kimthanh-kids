import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { isAuthed, me } from "./api/auth";
import type { TenantRole } from "./api/crm";
import { bootstrapAuth, setOnUnauthorized } from "./api/http";
import { ADMIN_ROLES, LESSON_EDITOR_ROLES, NON_FINANCE_ROLES, hasAnyRole, isAdminRole } from "./lib/roles";
import { useT } from "./i18n";
import { AppLayout } from "./components/AppLayout";
import { ConsentGate } from "./components/ConsentGate";
import { DashboardPage } from "./pages/DashboardPage";
import { ClassroomsPage } from "./pages/ClassroomsPage";
import { ClassroomDetailPage } from "./pages/ClassroomDetailPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { MembersPage } from "./pages/MembersPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ReportsPage } from "./pages/ReportsPage";
import { LeaveRequestsPage } from "./pages/LeaveRequestsPage";
import { TuitionPage } from "./pages/TuitionPage";
import { TuitionInvoiceDetailPage } from "./pages/TuitionInvoiceDetailPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
import { AssignmentsPage } from "./pages/AssignmentsPage";
import { MenusPage } from "./pages/MenusPage";
import { AlbumsPage } from "./pages/AlbumsPage";
import { LessonPlansPage } from "./pages/LessonPlansPage";
import { NotificationsPage } from "./pages/NotificationsPage";
import { PickupPage } from "./pages/PickupPage";
import { AuditPage } from "./pages/AuditPage";
import { SettingsPage } from "./pages/SettingsPage";
import { HealthPage } from "./pages/HealthPage";
import { LoginPage } from "./pages/LoginPage";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RouteLoading() {
  return (
    <div className="flex h-[50vh] items-center justify-center text-slate-400 text-sm">Đang tải…</div>
  );
}

function AccessState({ title, message }: { title: string; message: string }) {
  return (
    <main className="p-6">
      <div className="card mx-auto mt-10 max-w-xl p-8 text-center">
        <div className="text-lg font-bold text-slate-800">{title}</div>
        <p className="mt-2 text-sm text-slate-500">{message}</p>
      </div>
    </main>
  );
}

function RequireRole({ roles: allowed, children }: { roles: TenantRole[]; children: ReactNode }) {
  const { t } = useT();
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  if (meQuery.isLoading) return <RouteLoading />;
  const roles = (meQuery.data?.roles ?? []) as TenantRole[];
  if (!hasAnyRole(roles, allowed)) {
    return <AccessState title={t("common.forbiddenTitle")} message={t("common.forbiddenBody")} />;
  }
  return <>{children}</>;
}

function RequireFeature({ featureKey, children }: { featureKey: string; children: ReactNode }) {
  const { t } = useT();
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  if (meQuery.isLoading) return <RouteLoading />;
  if (meQuery.data?.features?.[featureKey] !== true) {
    return <AccessState title={t("feature.upgradeTitle")} message={t("feature.upgradeBody")} />;
  }
  return <>{children}</>;
}

/**
 * Trang chủ "/" = Dashboard, nhưng dashboard chỉ cho SCHOOL_ADMIN/PRINCIPAL (BE 403 với role khác).
 * User không phải admin → chuyển về "/students" (list mở cho mọi staff) để không đáp vào trang 403.
 */
function DashboardGate() {
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  if (meQuery.isLoading) return <RouteLoading />;
  const roles = (meQuery.data?.roles ?? []) as TenantRole[];
  return isAdminRole(roles) ? <DashboardPage /> : <Navigate to="/students" replace />;
}

export function App() {
  const navigate = useNavigate();
  // Access token in-memory mất khi reload → khôi phục phiên từ cookie refresh trước khi render route.
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    bootstrapAuth().finally(() => setBooting(false));
  }, []);
  useEffect(() => {
    setOnUnauthorized(() => navigate("/login", { replace: true }));
  }, [navigate]);

  if (booting) {
    return (
      <div className="flex h-screen items-center justify-center text-slate-400 text-sm">Đang tải…</div>
    );
  }

  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route
        element={
          <RequireAuth>
            <ConsentGate>
              <AppLayout />
            </ConsentGate>
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardGate />} />
        <Route path="/classrooms" element={<ClassroomsPage />} />
        <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/members" element={<RequireRole roles={ADMIN_ROLES}><MembersPage /></RequireRole>} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/health" element={<RequireRole roles={NON_FINANCE_ROLES}><HealthPage /></RequireRole>} />
        <Route path="/leave" element={<LeaveRequestsPage />} />
        <Route path="/tuition" element={<TuitionPage />} />
        <Route path="/tuition/:id" element={<TuitionInvoiceDetailPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="/albums" element={<RequireFeature featureKey="media_gallery"><AlbumsPage /></RequireFeature>} />
        <Route path="/lessons" element={<RequireRole roles={LESSON_EDITOR_ROLES}><RequireFeature featureKey="lesson_plan"><LessonPlansPage /></RequireFeature></RequireRole>} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/pickup" element={<RequireRole roles={NON_FINANCE_ROLES}><PickupPage /></RequireRole>} />
        <Route path="/audit-logs" element={<RequireRole roles={ADMIN_ROLES}><AuditPage /></RequireRole>} />
        <Route path="/settings" element={<RequireRole roles={ADMIN_ROLES}><SettingsPage /></RequireRole>} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
