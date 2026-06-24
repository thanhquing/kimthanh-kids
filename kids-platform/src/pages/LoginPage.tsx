import { Lock, Mail, ShieldCheck } from "lucide-react";
import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { login } from "@/api/auth";
import { ApiError } from "@/api/http";

export function LoginPage() {
  const navigate = useNavigate();
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
      setError(err instanceof ApiError ? "Email hoặc mật khẩu không đúng." : "Không kết nối được máy chủ.");
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
            <div className="font-bold text-lg leading-tight">KimThanh Kids</div>
            <div className="text-xs text-slate-400">Platform Console · Nội bộ</div>
          </div>
        </div>
        <h1 className="text-xl font-bold mt-5">Đăng nhập quản trị nền tảng</h1>
        <p className="text-sm text-slate-500 mb-5">Dành riêng cho đội ngũ KimThanh Kids.</p>

        <label className="label">Email</label>
        <div className="relative mb-3">
          <Mail className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
          <input
            className="field !pl-9"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="username"
          />
        </div>
        <label className="label">Mật khẩu</label>
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
          {loading ? "Đang đăng nhập…" : "Đăng nhập"}
        </button>

        <div className="mt-5 flex items-center gap-2 text-xs text-slate-400 bg-[#fff8f3] rounded-xl p-3">
          <ShieldCheck className="w-4 h-4 text-emerald-500" />
          Truy cập được ghi log &amp; yêu cầu 2FA ở môi trường production.
        </div>
      </form>
    </div>
  );
}
