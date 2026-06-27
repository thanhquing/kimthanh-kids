import { Lock } from "lucide-react";
import { NavLink, useNavigate } from "react-router-dom";
import { assets } from "@/mockData";
import { useMobileState } from "@/lib/mobileState";
import { useToast } from "@/components/ui/Toast";

export function LoginPage() {
  const navigate = useNavigate();
  const { setRole } = useMobileState();
  const { toast } = useToast();

  function enter(role: "parent" | "teacher") {
    setRole(role);
    toast(role === "parent" ? "Đã vào vai phụ huynh" : "Đã vào vai giáo viên");
    navigate(role === "parent" ? "/parent" : "/teacher");
  }

  return (
    <div className="phone-body">
      <div className="pt-2 text-center">
        <img src={assets.heroKids} alt="Các bé KimThanh" className="hero-img mb-4" />
        <img src={assets.logo} alt="KimThanh Kids" className="mx-auto mb-3 h-14 object-contain" />
        <div className="text-2xl font-bold">Chào mừng trở lại</div>
        <div className="mt-1 text-sm text-slate-500">Đăng nhập để tiếp tục với KimThanh Kids</div>
      </div>
      <form className="mt-8 space-y-4" onSubmit={(event) => event.preventDefault()}>
        <div>
          <label className="label">Email</label>
          <input className="field" type="email" defaultValue="phuhuynh@kimthanh.edu.vn" />
        </div>
        <div>
          <label className="label">Mật khẩu</label>
          <div className="relative">
            <input className="field pr-10" type="password" defaultValue="Password123" />
            <Lock className="absolute right-3 top-3.5 h-4 w-4 text-slate-400" />
          </div>
        </div>
        <div className="flex justify-between text-xs">
          <NavLink to="/reset-password" className="font-medium text-[color:var(--primary)]">Quên mật khẩu?</NavLink>
          <span className="text-slate-500">Demo role</span>
        </div>
        <button type="button" onClick={() => enter("parent")} className="btn-primary w-full">Vào app phụ huynh</button>
        <button type="button" onClick={() => enter("teacher")} className="btn-soft w-full">Dùng demo giáo viên</button>
      </form>
    </div>
  );
}
