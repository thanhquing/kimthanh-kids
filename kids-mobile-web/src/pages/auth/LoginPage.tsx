import { Lock, Phone } from "lucide-react";
import { useState, type FormEvent } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { login, me, roleForMobile } from "@/api/auth";
import { ApiError, tokenStore } from "@/api/http";
import type { TenantOption } from "@/api/public";
import { assets } from "@/mockData";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { TenantSelect } from "@/components/ui/TenantSelect";
import { useT } from "@/i18n";
import { useMobileState } from "@/lib/mobileState";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const { setRole } = useMobileState();
  const [tenant, setTenant] = useState<TenantOption | null>(null);
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(event: FormEvent) {
    event.preventDefault();
    setError(null);
    if (!tenant) {
      setError(t("auth.schoolRequired"));
      return;
    }
    setLoading(true);
    try {
      await login({ identifier: phone.trim(), password }, tenant.id);
      const profile = await me();
      const role = roleForMobile(profile.roles);
      if (!role) {
        tokenStore.clear();
        setError(t("auth.errRole"));
        return;
      }
      setRole(role);
      navigate(role === "parent" ? "/parent" : "/teacher", { replace: true });
    } catch (err) {
      setError(
        err instanceof ApiError ? t("auth.errInvalid") : t("auth.errNetwork"),
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="phone-body">
      <div className="flex justify-end py-2">
        <LanguageToggle />
      </div>
      <div className="text-center">
        <img
          src={assets.logo}
          alt="KimThanh Kids"
          className="mx-auto mb-3 h-14 object-contain"
        />
        <div className="text-2xl font-bold">{t("auth.welcome")}</div>
        <div className="mt-1 text-sm text-slate-500">{t("auth.subtitle")}</div>
      </div>
      <form className="mt-8 space-y-4" onSubmit={onSubmit}>
        <TenantSelect value={tenant} onChange={setTenant} />
        <div>
          <label className="label">{t("auth.phoneLabel")}</label>
          <div className="relative">
            <input
              className="field pr-10"
              type="tel"
              inputMode="tel"
              autoComplete="username"
              placeholder={t("auth.phonePlaceholder")}
              value={phone}
              onChange={(event) => setPhone(event.target.value)}
            />
            <Phone className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div>
          <label className="label">{t("auth.passwordLabel")}</label>
          <div className="relative">
            <input
              className="field pr-10"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />
            <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
            {error}
          </div>
        )}

        <div className="flex justify-end text-xs">
          <NavLink
            to="/reset-password"
            className="font-medium text-[color:var(--primary)]"
          >
            {t("auth.forgot")}
          </NavLink>
        </div>
        <button
          type="submit"
          disabled={loading}
          className="btn-primary w-full disabled:opacity-60"
        >
          {loading ? t("auth.submitting") : t("auth.submit")}
        </button>
      </form>
    </div>
  );
}
