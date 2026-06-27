import { Navigate, Route, Routes } from "react-router-dom";
import { useLayoutEffect } from "react";
import { PhoneFrame, MobileLayout } from "@/components/mobile/MobileShell";
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
import { ProfilePage } from "@/pages/shared/ProfilePage";
import { StudentDetailPage } from "@/pages/shared/StudentDetailPage";
import { AnnouncementComposePage } from "@/pages/teacher/AnnouncementComposePage";
import { AttendanceHistoryPage } from "@/pages/teacher/AttendanceHistoryPage";
import { AttendanceMarkPage } from "@/pages/teacher/AttendanceMarkPage";
import { ClassRosterPage } from "@/pages/teacher/ClassRosterPage";
import { LessonPlanPage } from "@/pages/teacher/LessonPlanPage";
import { MedicineApprovePage } from "@/pages/teacher/MedicineApprovePage";
import { ReportComposePage } from "@/pages/teacher/ReportComposePage";
import { TeacherHomePage } from "@/pages/teacher/TeacherHomePage";
import { useMobileState } from "@/lib/mobileState";
import type { Role } from "@/lib/routes";

function RoleLayout({ role }: { role: Role }) {
  const { setRole } = useMobileState();
  useLayoutEffect(() => setRole(role), [role, setRole]);
  return <MobileLayout />;
}

export function App() {
  return (
    <PhoneFrame>
      <Routes>
        <Route path="/" element={<Navigate to="/login" replace />} />
        <Route path="/login" element={<LoginPage />} />
        <Route path="/reset-password" element={<ResetPasswordPage />} />
        <Route path="/parent" element={<RoleLayout role="parent" />}>
          <Route index element={<ParentHomePage />} />
          <Route path="children" element={<ChildrenListPage />} />
          <Route path="student/:id" element={<StudentDetailPage />} />
          <Route path="reports" element={<ReportFeedPage />} />
          <Route path="album" element={<AlbumGalleryPage />} />
          <Route path="invoices" element={<InvoicesPage />} />
          <Route path="payment" element={<PaymentCheckoutPage />} />
          <Route path="menu" element={<MenuWeeklyPage />} />
          <Route path="leave" element={<LeaveRequestPage />} />
          <Route path="announcements" element={<AnnouncementsPage />} />
          <Route path="medicine" element={<MedicineListPage />} />
          <Route path="medicine/new" element={<MedicineCreatePage />} />
          <Route path="medicine/:id" element={<MedicineDetailPage />} />
          <Route path="notifications" element={<NotificationsPage />} />
          <Route path="profile" element={<ProfilePage />} />
        </Route>

        <Route path="/teacher" element={<RoleLayout role="teacher" />}>
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
