import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { isAuthed } from "./api/auth";
import { bootstrapAuth, setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
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
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/classrooms" element={<ClassroomsPage />} />
        <Route path="/classrooms/:id" element={<ClassroomDetailPage />} />
        <Route path="/students" element={<StudentsPage />} />
        <Route path="/students/:id" element={<StudentProfilePage />} />
        <Route path="/members" element={<MembersPage />} />
        <Route path="/attendance" element={<AttendancePage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/health" element={<HealthPage />} />
        <Route path="/leave" element={<LeaveRequestsPage />} />
        <Route path="/tuition" element={<TuitionPage />} />
        <Route path="/tuition/:id" element={<TuitionInvoiceDetailPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/assignments" element={<AssignmentsPage />} />
        <Route path="/menus" element={<MenusPage />} />
        <Route path="/albums" element={<AlbumsPage />} />
        <Route path="/lessons" element={<LessonPlansPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />
        <Route path="/pickup" element={<PickupPage />} />
        <Route path="/audit-logs" element={<AuditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
