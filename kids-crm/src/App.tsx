import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { isAuthed } from "./api/auth";
import { setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { ClassroomsPage } from "./pages/ClassroomsPage";
import { ClassroomDetailPage } from "./pages/ClassroomDetailPage";
import { StudentsPage } from "./pages/StudentsPage";
import { StudentProfilePage } from "./pages/StudentProfilePage";
import { MembersPage } from "./pages/MembersPage";
import { AttendancePage } from "./pages/AttendancePage";
import { ReportsPage } from "./pages/ReportsPage";
import { TuitionPage } from "./pages/TuitionPage";
import { TuitionInvoiceDetailPage } from "./pages/TuitionInvoiceDetailPage";
import { AnnouncementsPage } from "./pages/AnnouncementsPage";
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
  useEffect(() => {
    setOnUnauthorized(() => navigate("/login", { replace: true }));
  }, [navigate]);

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
        <Route path="/tuition" element={<TuitionPage />} />
        <Route path="/tuition/:id" element={<TuitionInvoiceDetailPage />} />
        <Route path="/announcements" element={<AnnouncementsPage />} />
        <Route path="/audit-logs" element={<AuditPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
