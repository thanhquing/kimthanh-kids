import { Bell, Languages, Lock, LogOut, Moon, Phone, User } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { logout, useMe } from "@/api/auth";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, ProfileRow } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { languageStore } from "@/lib/language";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";
import { initialsFromName } from "@/lib/studentDisplay";
import { assets } from "@/mockData";

export function ProfilePage() {
  const { role, setRole } = useMobileState();
  const navigate = useNavigate();
  const { t, lang } = useT();
  const { data: profile } = useMe();
  const isTeacher = role === "teacher";
  const base = roleBase(role);
  const name = profile?.fullName ?? "—";
  const phone = profile?.phone ?? "—";
  const roleLabel = isTeacher ? t("profile.roleTeacher") : t("profile.roleParent");

  async function onLogout() {
    await logout();
    setRole(null);
    navigate("/login", { replace: true });
  }

  return (
    <>
      <TopBar title={t("profile.title")} />
      <div className="mt-3 text-center">
        <Avatar initials={initialsFromName(name)} image={isTeacher ? assets.teacher : undefined} size="xl" />
        <div className="mt-3 text-lg font-bold">{name}</div>
        <div className="text-xs text-slate-500">{`${roleLabel} · ${phone}`}</div>
      </div>
      <div className="section-title">{t("profile.sectionPersonal")}</div>
      <div className="card divide-y divide-slate-100">
        <ProfileRow icon={User} label={t("profile.fullName")} value={name} />
        <ProfileRow icon={Phone} label={t("profile.phone")} value={phone} />
      </div>
      <div className="section-title">{t("profile.sectionSettings")}</div>
      <div className="card divide-y divide-slate-100">
        <ProfileRow icon={Bell} label={t("profile.notifications")} value={t("profile.notificationsOn")} to={`${base}/notifications`} />
        <ProfileRow
          icon={Languages}
          label={t("profile.language")}
          value={lang === "vi" ? "Tiếng Việt" : "English"}
          onClick={() => languageStore.toggle()}
        />
        <ProfileRow icon={Moon} label={t("profile.darkMode")} value={t("profile.off")} />
        <ProfileRow icon={Lock} label={t("profile.changePassword")} />
      </div>
      <button type="button" onClick={onLogout} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-600">
        <LogOut className="h-4 w-4" /> {t("profile.logout")}
      </button>
    </>
  );
}
