import { useEffect, type ReactNode } from "react";
import { Navigate, Route, Routes, useNavigate } from "react-router-dom";
import { isAuthed } from "./api/auth";
import { setOnUnauthorized } from "./api/http";
import { AppLayout } from "./components/AppLayout";
import { CouponsPage } from "./pages/CouponsPage";
import { DashboardPage } from "./pages/DashboardPage";
import { InvoicesPage } from "./pages/InvoicesPage";
import { LoginPage } from "./pages/LoginPage";
import { ObservabilityPage } from "./pages/ObservabilityPage";
import { PlansPage } from "./pages/PlansPage";
import { SubscriptionsPage } from "./pages/SubscriptionsPage";
import { TenantDetailPage } from "./pages/TenantDetailPage";
import { TenantsPage } from "./pages/TenantsPage";

function RequireAuth({ children }: { children: ReactNode }) {
  if (!isAuthed()) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

export function App() {
  const navigate = useNavigate();
  useEffect(() => {
    // Hết phiên (401 không refresh được) → về login.
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
        <Route path="/tenants" element={<TenantsPage />} />
        <Route path="/tenants/:id" element={<TenantDetailPage />} />
        <Route path="/subscriptions" element={<SubscriptionsPage />} />
        <Route path="/invoices" element={<InvoicesPage />} />
        <Route path="/plans" element={<PlansPage />} />
        <Route path="/coupons" element={<CouponsPage />} />
        <Route path="/observability" element={<ObservabilityPage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
