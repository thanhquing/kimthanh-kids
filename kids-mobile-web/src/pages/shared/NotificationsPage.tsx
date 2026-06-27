import { Bell, Settings } from "lucide-react";
import { useState } from "react";
import { TopBar } from "@/components/mobile/MobileShell";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { notifications } from "@/mockData";

export function NotificationsPage() {
  const [settingsOpen, setSettingsOpen] = useState(false);

  return (
    <>
      <TopBar title="Thông báo đẩy" rightIcon={Settings} onRight={() => setSettingsOpen(true)} />
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="font-bold">Bật thông báo để không bỏ lỡ cập nhật</div>
        <div className="mt-1 text-xs opacity-80">PWA sẽ xin quyền notification khi tích hợp production.</div>
      </div>
      <div className="mt-3 space-y-2">
        {notifications.map((notification) => (
          <div key={notification} className="card flex gap-3 p-3">
            <Bell className="h-5 w-5 text-[color:var(--primary)]" />
            <div className="text-sm">{notification}</div>
          </div>
        ))}
      </div>
      <BottomSheet open={settingsOpen} title="Cài đặt thông báo" onClose={() => setSettingsOpen(false)}>
        <div className="space-y-3">
          {["Báo cáo ngày", "Học phí", "Thuốc và sức khỏe"].map((item) => (
            <div key={item} className="card flex items-center justify-between p-3">
              <div className="text-sm font-semibold">{item}</div>
              <span className="chip active">Bật</span>
            </div>
          ))}
        </div>
      </BottomSheet>
    </>
  );
}

