import { NavLink } from "react-router-dom";
import { TextField } from "@/components/ui/Field";
import { useToast } from "@/components/ui/Toast";

export function ResetPasswordPage() {
  const { toast } = useToast();

  return (
    <div className="phone-body">
      <div className="pt-10 text-center">
        <div className="text-2xl font-bold">Đặt lại mật khẩu</div>
        <div className="mt-1 text-sm text-slate-500">
          Nhập email để nhận hướng dẫn khôi phục tài khoản.
        </div>
      </div>
      <div className="mt-8 space-y-4">
        <TextField label="Email" value="phuhuynh@kimthanh.edu.vn" type="email" />
        <button type="button" className="btn-primary w-full" onClick={() => toast("Đã gửi email đặt lại mật khẩu")}>
          Gửi hướng dẫn
        </button>
        <NavLink to="/login" className="btn-soft block w-full text-center">
          Quay lại đăng nhập
        </NavLink>
      </div>
    </div>
  );
}

