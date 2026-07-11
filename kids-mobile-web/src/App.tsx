import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { useEffect, useLayoutEffect, useState, type ReactNode } from "react";
import { isAuthed, roleForMobile, useMe } from "@/api/auth";
import { bootstrapAuth, setOnUnauthorized } from "@/api/http";
import { PhoneFrame, MobileLayout } from "@/components/mobile/MobileShell";
import { ConsentGate } from "@/components/ConsentGate";
import { LoginPage } from "@/pages/auth/LoginPage";
import { ResetPasswordPage } from "@/pages/auth/ResetPasswordPage";
import { AlbumGalleryPage } from "@/pages/parent/AlbumGalleryPage";
import { ChildrenListPage } from "@/pages/parent/ChildrenListPage";
import { InvoicesPage } from "@/pages/parent/InvoicesPage";
import { LeaveRequestPage } from "@/pages/parent/LeaveRequestPage";
import { MenuWeeklyPage } from "@/pages/parent/MenuWeeklyPage";
import { ParentHomePage } from "@/pages/parent/ParentHomePage";
import { PaymentCheckoutPage } from "@/pages/parent/PaymentCheckoutPage";
import { ReportFeedPage } from "@/pages/parent/ReportFeedPage";
import { AnnouncementsPage } from "@/pages/shared/AnnouncementsPage";
import { MedicineCreatePage } from "@/pages/shared/MedicineCreatePage";
import { MedicineDetailPage } from "@/pages/shared/MedicineDetailPage";
import { MedicineListPage } from "@/pages/shared/MedicineListPage";
import { NotificationsPage } from "@/pages/shared/NotificationsPage";
import { PickupPage } from "@/pages/shared/PickupPage";
import { ProfilePage } from "@/pages/shared/ProfilePage";
import { StudentDetailPage } from "@/pages/shared/StudentDetailPage";
import { AnnouncementComposePage } from "@/pages/teacher/AnnouncementComposePage";
import { AttendanceHistoryPage } from "@/pages/teacher/AttendanceHistoryPage";
import { AttendanceMarkPage } from "@/pages/teacher/AttendanceMarkPage";
import { ClassRosterPage } from "@/pages/teacher/ClassRosterPage";
import { LessonPlanPage } from "@/pages/teacher/LessonPlanPage";
import { LeaveApprovePage } from "@/pages/teacher/LeaveApprovePage";
import { MedicineApprovePage } from "@/pages/teacher/MedicineApprovePage";
import { ReportComposePage } from "@/pages/teacher/ReportComposePage";
import { TeacherHomePage } from "@/pages/teacher/TeacherHomePage";
import { useMobileState } from "@/lib/mobileState";
import type { Role } from "@/lib/routes";

/**
 * Chặn theo phiên + vai trò: chưa login → /login; đã login nhưng role không khớp khu vực
 * (vd phụ huynh mở /teacher/*) → điều hướng về home đúng role. Verify bằng /auth/me khi
 * reload sâu (token có sẵn nhưng state role chưa khôi phục).
 */
function RoleGuard({ role, children }: { role: Role; children: ReactNode }) {
  const { data: me, isLoading, isError } = useMe();
  if (!isAuthed()) return <Navigate to="/login" replace />;
  if (isLoading) return null;
  if (isError || !me) return <Navigate to="/login" replace />;
  const actual = roleForMobile(me.roles);
  if (!actual) return <Navigate to="/login" replace />;
  // BL-046: chưa đồng ý văn bản pháp lý hiệu lực → chặn bằng cổng consent trước khi vào app.
  if (me.pendingConsents && me.pendingConsents.length > 0) return <ConsentGate />;
  if (actual !== role) return <Navigate to={actual === "teacher" ? "/teacher" : "/parent"} replace />;
  return <>{children}</>;
}

function RoleLayout({ role }: { role: Role }) {
  const { setRole } = useMobileState();
  useLayoutEffect(() => setRole(role), [role, setRole]);
  return <MobileLayout />;
}

export function App() {
  const navigate = useNavigate();
  // Access token in-memory mất khi reload → thử khôi phục phiên từ cookie refresh trước khi render route.
  const [booting, setBooting] = useState(true);
  useEffect(() => {
    bootstrapAuth().finally(() => setBooting(false));
  }, []);
  useEffect(() => {
    setOnUnauthorized(() => navigate("/login", { replace: true }));
  }, [navigate]);

  if (booting) {
    return (
      <PhoneFrame>
        <div className="flex h-full items-center justify-center text-slate-400 text-sm">Đang tải…</div>
      </PhoneFrame>
    );
  }

  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route
          path="/parent"
          element={
            <RoleGuard role="parent">
              <RoleLayout role="parent" />
            </RoleGuard>
          }
        >
          <Route index element={<ParentHomePage />} />
          <Route path="children" element={<ChildrenListPage />} />
          <Route path="student/:id" element={<StudentDetailPage />} />
          <Route path="reports" element={<ReportFeedPage />} />
          <Route path="album" element={<AlbumGalleryPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payment" element={<PaymentCheckoutPage />} />
          <Route path="menu" element={<MenuWeeklyPage />} />
          <Route path="leave" element={<LeaveRequestPage />} />
          <Route path="pickup" element={<PickupPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="medicine" element={<MedicineListPage />} />
          <Route path="medicine/new" element={<MedicineCreatePage />} />
          <Route path="medicine/:id" element={<MedicineDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route
          path="/teacher"
          element={
            <RoleGuard role="teacher">
              <RoleLayout role="teacher" />
            </RoleGuard>
          }
        >
          <Route index element={<TeacherHomePage />} />
          <Route path="class" element={<ClassRosterPage />} />
          <Route path="student/:id" element={<StudentDetailPage />} />
          <Route path="attendance" element={<AttendanceMarkPage />} />
          <Route path="attendance/history" element={<AttendanceHistoryPage />} />
          <Route path="reports/new" element={<ReportComposePage />} />
          <Route path="album" element={<AlbumGalleryPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="announcements/new" element={<AnnouncementComposePage />} />
          <Route path="lesson-plan" element={<LessonPlanPage />} />
          <Route path="leave/approve" element={<LeaveApprovePage />} />
          <Route path="pickup" element={<PickupPage />} />
          <Route path="medicine" element={<MedicineListPage />} />
          <Route path="medicine/approve" element={<MedicineApprovePage />} />
          <Route path="medicine/:id" element={<MedicineDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
    </PhoneFrame>
  );
}
