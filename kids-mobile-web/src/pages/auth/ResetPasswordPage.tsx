import { Phone, ShieldQuestion } from "lucide-react";
import { NavLink } from "react-router-dom";
import { LanguageToggle } from "@/components/ui/LanguageToggle";
import { useT } from "@/i18n";

/**
 * Tài khoản do nhà trường cấp qua CRM (kèm mật khẩu mặc định) — chưa có self-service
 * reset password ở kids-api. Màn này hướng dẫn liên hệ trường để được cấp lại.
 * TODO(backend): bổ sung khi kids-api có luồng forgot/reset password.
 */
export function ResetPasswordPage() {
  const { t } = useT();
  return (
    <div className="phone-body">
      <div className="flex justify-end py-2">
        <LanguageToggle />
      </div>
      <div className="pt-6 text-center">
        <div className="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-full bg-orange-50">
          <ShieldQuestion className="h-8 w-8 text-[color:var(--primary)]" />
        </div>
        <div className="text-2xl font-bold">{t("auth.resetTitle")}</div>
        <div className="mx-auto mt-2 max-w-xs text-sm text-slate-500">{t("auth.resetDesc")}</div>
      </div>
      <div className="card mt-8 flex items-center gap-3">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-slate-50">
          <Phone className="h-5 w-5 text-slate-500" />
        </div>
        <div>
          <div className="text-xs text-slate-500">{t("auth.resetHotline")}</div>
          <a href="tel:02838221234" className="text-base font-semibold text-slate-800">
            028 3822 1234
          </a>
        </div>
      </div>
      <NavLink to="/login" className="btn-primary mt-8 block w-full text-center">
        {t("auth.resetBack")}
      </NavLink>
    </div>
  );
}
