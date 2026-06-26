import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import {
  Activity,
  Bell,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  HeartPulse,
  LayoutDashboard,
  Megaphone,
  Receipt,
  Settings,
  Users,
} from "lucide-react";
import { isAuthed } from "./api/auth";
import { setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
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
        <Route
          path="/"
          element={
            <PlaceholderPage
              title="Tổng quan"
              section="CRM nhà trường"
              icon={LayoutDashboard}
              description="Màn P0: KPI vận hành (học sinh, lớp, nhân sự, điểm danh hôm nay, công nợ, doanh thu tháng)."
              endpoints={["GET /dashboard/summary"]}
            />
          }
        />
        <Route
          path="/classrooms"
          element={
            <PlaceholderPage
              title="Lớp học"
              section="Hồ sơ"
              icon={BookOpen}
              description="Màn P0 tiếp theo: danh sách lớp, tạo/sửa lớp, sĩ số và GVCN."
              endpoints={["GET /classrooms", "POST /classrooms", "PATCH /classrooms/:id"]}
            />
          }
        />
        <Route
          path="/students"
          element={
            <PlaceholderPage
              title="Học sinh"
              section="Hồ sơ"
              icon={Users}
              description="Màn P0: hồ sơ học sinh, lọc theo lớp, chi tiết và gán phụ huynh."
              endpoints={["GET /students", "POST /students", "POST /students/:id/guardians"]}
            />
          }
        />
        <Route
          path="/members"
          element={
            <PlaceholderPage
              title="Nhân sự"
              section="Hồ sơ"
              icon={ClipboardList}
              description="Màn P0: tạo tài khoản GV/y tá/kế toán/phụ huynh và bật/tắt trạng thái."
              endpoints={["GET /tenant/members", "POST /tenant/members", "PATCH /tenant/members/:id/status"]}
            />
          }
        />
        <Route
          path="/attendance"
          element={
            <PlaceholderPage
              title="Điểm danh"
              section="Vận hành"
              icon={CalendarCheck}
              description="Màn P0: chọn lớp/ngày, điểm danh hàng loạt và xem bảng điểm danh."
              endpoints={["POST /attendance/mark", "GET /attendance?classroomId=&date="]}
            />
          }
        />
        <Route
          path="/reports"
          element={
            <PlaceholderPage
              title="Sổ liên lạc"
              section="Vận hành"
              icon={Bell}
              description="Màn P1: soạn báo cáo ngày và xem feed theo lớp/ngày."
              endpoints={["POST /daily-reports", "GET /daily-reports"]}
            />
          }
        />
        <Route
          path="/health"
          element={
            <PlaceholderPage
              title="Sức khỏe"
              section="Vận hành"
              icon={HeartPulse}
              description="Màn P1: sức khỏe, dị ứng, thuốc và sự cố."
              endpoints={["/health", "/allergies", "/medicine", "/incidents"]}
            />
          }
        />
        <Route
          path="/tuition"
          element={
            <PlaceholderPage
              title="Học phí"
              section="Tài chính"
              icon={Receipt}
              description="Màn P0: hóa đơn học phí, VietQR, thu tiền mặt, in HTML và export CSV."
              endpoints={["GET /tuition/invoices", "POST /tuition/invoices", "GET /tuition/invoices/:id/vietqr"]}
            />
          }
        />
        <Route
          path="/announcements"
          element={
            <PlaceholderPage
              title="Thông báo"
              section="Nội dung"
              icon={Megaphone}
              description="Màn P0: soạn nháp, publish và xem feed thông báo."
              endpoints={["POST /announcements", "POST /announcements/:id/publish", "GET /announcements/feed"]}
            />
          }
        />
        <Route
          path="/audit-logs"
          element={
            <PlaceholderPage
              title="Nhật ký"
              section="Vận hành"
              icon={Activity}
              description="Màn P0: xem nhật ký hành động nhạy cảm trong tenant."
              endpoints={["GET /audit-logs"]}
            />
          }
        />
        <Route
          path="/settings"
          element={
            <PlaceholderPage
              title="Cài đặt trường"
              section="Cấu hình"
              icon={Settings}
              description="Màn P0: thông tin/branding trường, MST & địa chỉ chứng từ, tài khoản ngân hàng để sinh VietQR."
              endpoints={["GET /tenant/settings", "PATCH /tenant/settings"]}
            />
          }
        />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

