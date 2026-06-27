import { Bell, Lock, LogOut, Mail, Moon, User } from "lucide-react";
import { TopBar } from "@/components/mobile/MobileShell";
import { Avatar, ProfileRow } from "@/components/mobile/Primitives";
import { useToast } from "@/components/ui/Toast";
import { useMobileState } from "@/lib/mobileState";
import { roleBase } from "@/lib/routes";
import { assets } from "@/mockData";

export function ProfilePage() {
  const { role } = useMobileState();
  const { toast } = useToast();
  const isTeacher = role === "teacher";
  const base = roleBase(role);

  return (
    <>
      <TopBar title="Hồ sơ của tôi" />
      <div className="mt-3 text-center">
        <Avatar initials={isTeacher ? "H" : "L"} image={isTeacher ? assets.teacher : undefined} size="xl" />
        <div className="mt-3 text-lg font-bold">{isTeacher ? "Trần Thu Hà" : "Nguyễn Thị Lan"}</div>
        <div className="text-xs text-slate-500">{isTeacher ? "Giáo viên · ha.tran@kimthanh.edu.vn" : "Phụ huynh · lan.nguyen@gmail.com"}</div>
      </div>
      <div className="section-title">Thông tin cá nhân</div>
      <div className="card divide-y divide-slate-100">
        <ProfileRow icon={User} label="Họ tên" value={isTeacher ? "Trần Thu Hà" : "Nguyễn Thị Lan"} />
        <ProfileRow icon={Mail} label="Email" value={isTeacher ? "ha.tran@kimthanh.edu.vn" : "lan.nguyen@gmail.com"} />
      </div>
      <div className="section-title">Cài đặt</div>
      <div className="card divide-y divide-slate-100">
        <ProfileRow icon={Bell} label="Thông báo" value="Đang bật" to={`${base}/notifications`} />
        <ProfileRow icon={Moon} label="Giao diện tối" value="Tắt" />
        <ProfileRow icon={Lock} label="Đổi mật khẩu" />
      </div>
      <button type="button" onClick={() => toast("Đã đăng xuất demo")} className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl bg-red-50 p-3 font-semibold text-red-600">
        <LogOut className="h-4 w-4" /> Đăng xuất
      </button>
    </>
  );
}
