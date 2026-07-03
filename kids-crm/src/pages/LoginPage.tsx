import { Building2, Headphones, Lock, Phone, UserCog } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { ApiError } from "@/api/http";
import logoFull from "@/assets/logo-kimthanh.png";
import type { TenantOption } from "@/api/public";
import { Modal } from "@/components/ui/Modal";
import { TenantSelect } from "@/components/ui/TenantSelect";
import { useT } from "@/i18n";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [tenant, setTenant] = useState<TenantOption | null>(null);
  const [identifier, setIdentifier] = useState("0909000001");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    if (!tenant) {
      setError(t("login.schoolRequired"));
      return;
    }
    setLoading(true);
    try {
      await login({ identifier, password }, tenant.id);
      navigate("/", { replace: true });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.code === "UNAUTHORIZED" ? t("login.errInvalid") : err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError(t("login.errNetwork"));
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="min-h-screen grid place-items-center bg-[#fff8f3] p-6">
      <div className="grid w-full max-w-4xl overflow-hidden rounded-2xl bg-white shadow-2xl shadow-[#b94a3f]/15 ring-1 ring-white/70 md:grid-cols-2">
        <div className="brand-grad text-white p-10 hidden md:flex flex-col justify-between">
          <div className="inline-flex w-fit rounded-2xl bg-white px-4 py-3 shadow-lg shadow-[#b94a3f]/15">
            <img src={logoFull} alt={t("brand.name")} className="h-12 w-auto" />
          </div>
          <div>
            <div className="text-3xl font-bold mb-2">
              {t("login.brandWelcome")}
              <br />
              {t("login.adminConsole")}
            </div>
            <p className="opacity-80 text-sm">{t("login.tagline")}</p>
          </div>
          <div className="text-xs opacity-70">{t("login.copyright")}</div>
        </div>

        <form onSubmit={onSubmit} className="relative z-10 bg-white p-10 md:border-l md:border-[#f4e7e0]">
          <h1 className="text-2xl font-bold mb-1">{t("login.title")}</h1>
          <p className="text-sm text-slate-500 mb-6">{t("login.subtitle")}</p>

          <div className="space-y-4">
            <TenantSelect value={tenant} onChange={setTenant} />

            <div>
              <label className="label">{t("login.identifierLabel")}</label>
              <div className="relative">
                <Phone className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  className="field !pl-9"
                  type="tel"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label className="label">{t("login.passwordLabel")}</label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                <input
                  type="password"
                  className="field !pl-9"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="current-password"
                  placeholder="••••••••••"
                />
              </div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2">
                <input type="checkbox" defaultChecked />
                {t("login.rememberMe")}
              </label>
              <button
                type="button"
                className="text-[color:var(--primary)] font-medium"
                onClick={() => setForgotOpen(true)}
              >
                {t("login.forgot")}
              </button>
            </div>

            {error && (
              <div className="text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>
            )}

            <button type="submit" className="btn-primary w-full" disabled={loading || !tenant}>
              {loading ? t("login.submitting") : t("login.submit")}
            </button>
          </div>
        </form>
      </div>

      <Modal
        open={forgotOpen}
        onClose={() => setForgotOpen(false)}
        title={t("login.forgotTitle")}
        footer={
          <button className="btn-primary text-sm" onClick={() => setForgotOpen(false)}>
            {t("login.forgotUnderstood")}
          </button>
        }
      >
        <div className="space-y-3">
          <div className="rounded-xl border border-[#f1e3dc] bg-[#fff8f3] p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-white p-2 text-[color:var(--primary)]">
                <UserCog className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">{t("login.forgotStaffTitle")}</div>
                <p className="mt-1 text-sm text-slate-500">{t("login.forgotStaffDesc")}</p>
              </div>
            </div>
          </div>

          <div className="rounded-xl border border-[#f1e3dc] bg-white p-4">
            <div className="flex items-start gap-3">
              <div className="mt-0.5 rounded-lg bg-[#fff8f3] p-2 text-[color:var(--primary)]">
                <Building2 className="h-4 w-4" />
              </div>
              <div>
                <div className="font-semibold">{t("login.forgotOwnerTitle")}</div>
                <p className="mt-1 text-sm text-slate-500">{t("login.forgotOwnerDesc")}</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-3 py-2 text-sm text-slate-500">
            <Headphones className="h-4 w-4 text-slate-400" />
            <span>{t("login.forgotEmailNote")}</span>
          </div>
        </div>
      </Modal>
    </main>
  );
}
