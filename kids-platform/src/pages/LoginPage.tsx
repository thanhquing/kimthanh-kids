import { Lock, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { ApiError } from "@/api/http";
import { useT } from "@/i18n";

export function LoginPage() {
  const navigate = useNavigate();
  const { t } = useT();
  const [email, setEmail] = useState("admin@kimthanhkids.vn");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      await login({ identifier: email, password });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? t("login.errInvalid") : t("login.errNetwork"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen grid place-items-center brand-grad p-4">
      <form onSubmit={onSubmit} className="card w-full max-w-md p-8">
        <div className="flex items-center gap-3 mb-1">
          <div className="w-10 h-10 rounded-xl brand-grad grid place-items-center text-white font-bold">
            K
          </div>
          <div>
            <div className="font-bold text-lg leading-tight">{t("brand.name")}</div>
            <div className="text-xs text-slate-400">{t("login.consoleInternal")}</div>
          </div>
        </div>
        <h1 className="text-xl font-bold mt-5">{t("login.title")}</h1>
        <p className="text-sm text-slate-500 mb-5">{t("login.subtitle")}</p>

        <label className="label">{t("login.emailLabel")}</label>
        <div className="relative mb-3">
          <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            className="field !pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <label className="label">{t("login.passwordLabel")}</label>
        <div className="relative mb-2">
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

        {error && (
          <div className="mb-3 text-sm text-red-600 bg-red-50 rounded-xl px-3 py-2">{error}</div>
        )}

        <button type="submit" className="btn-primary w-full mt-4" disabled={loading}>
          {loading ? t("login.submitting") : t("login.submit")}
        </button>
      </form>
    </div>
  );
}
