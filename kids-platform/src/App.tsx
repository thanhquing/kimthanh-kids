import { useEffect, useState, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { isAuthed } from "./api/auth";
import { bootstrapAuth, setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
import { CouponsPage } from "./pages/CouponsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoiceDetailPage } from "./pages/InvoiceDetailPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { PublicInvoicePage } from "./pages/PublicInvoicePage";
import { ObservabilityPage } from "./pages/ObservabilityPage";
import { PlansPage } from "./pages/PlansPage";
import { PostsPage } from "./pages/PostsPage";
import { SettingsPage } from "./pages/SettingsPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { TenantDetailPage } from "./pages/TenantDetailPage";
import { TenantsPage } from "./pages/TenantsPage";
import { WorklistPage } from "./pages/WorklistPage";

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
    // Hết phiên (401 không refresh được) → về login.
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
      <Route path="/hoa-don/:token" element={<PublicInvoicePage />} />
      <Route
        element={
          <RequireAuth>
            <AppLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:id" element={<TenantDetailPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/invoices/:id" element={<InvoiceDetailPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/posts" element={<PostsPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/worklist" element={<WorklistPage />} />
        <Route path="/observability" element={<ObservabilityPage />} />
        <Route path="/settings" element={<SettingsPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
