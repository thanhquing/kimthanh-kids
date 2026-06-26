import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  HeartPulse,
  Megaphone,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { isAuthed } from "./api/auth";
import { setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
import { DashboardPage } from "./pages/DashboardPage";
import { LoginPage } from "./pages/LoginPage";
import { PlaceholderPage } from "./pages/PlaceholderPage";

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
        <Route
          path="/classrooms"
          element={
            <PlaceholderPage
              titleKey="nav.classrooms"
              sectionKey="sections.profile"
              icon={BookOpen}
              descKey="routes.classrooms"
              endpoints={["GET /classrooms", "POST /classrooms", "PATCH /classrooms/:id"]}
            />
          }
        />
        <Route
          path="/students"
          element={
            <PlaceholderPage
              titleKey="nav.students"
              sectionKey="sections.profile"
              icon={Users}
              descKey="routes.students"
              endpoints={["GET /students", "POST /students", "POST /students/:id/guardians"]}
            />
          }
        />
        <Route
          path="/members"
          element={
            <PlaceholderPage
              titleKey="nav.members"
              sectionKey="sections.profile"
              icon={ClipboardList}
              descKey="routes.members"
              endpoints={["GET /tenant/members", "POST /tenant/members", "PATCH /tenant/members/:id/status"]}
            />
          }
        />
        <Route
          path="/attendance"
          element={
            <PlaceholderPage
              titleKey="nav.attendance"
              sectionKey="sections.operations"
              icon={CalendarCheck}
              descKey="routes.attendance"
              endpoints={["POST /attendance/mark", "GET /attendance?classroomId=&date="]}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <PlaceholderPage
              titleKey="nav.reports"
              sectionKey="sections.operations"
              icon={Bell}
              descKey="routes.reports"
              endpoints={["POST /daily-reports", "GET /daily-reports"]}
            />
          }
        />
        <Route
          path="/health"
          element={
            <PlaceholderPage
              titleKey="nav.health"
              sectionKey="sections.operations"
              icon={HeartPulse}
              descKey="routes.health"
              endpoints={["/health", "/allergies", "/medicine", "/incidents"]}
            />
          }
        />
        <Route
          path="/tuition"
          element={
            <PlaceholderPage
              titleKey="nav.tuition"
              sectionKey="sections.finance"
              icon={Receipt}
              descKey="routes.tuition"
              endpoints={["GET /tuition/invoices", "POST /tuition/invoices", "GET /tuition/invoices/:id/vietqr"]}
            />
          }
        />
        <Route
          path="/announcements"
          element={
            <PlaceholderPage
              titleKey="nav.announcements"
              sectionKey="sections.content"
              icon={Megaphone}
              descKey="routes.announcements"
              endpoints={["POST /announcements", "POST /announcements/:id/publish", "GET /announcements/feed"]}
            />
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PlaceholderPage
              titleKey="nav.auditLogs"
              sectionKey="sections.operations"
              icon={Activity}
              descKey="routes.auditLogs"
              endpoints={["GET /audit-logs"]}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              titleKey="nav.settings"
              sectionKey="sections.config"
              icon={Settings}
              descKey="routes.settings"
              endpoints={["GET /tenant/settings", "PATCH /tenant/settings"]}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
