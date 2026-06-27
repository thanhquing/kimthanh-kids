import { Calendar, Pill, Receipt, Soup } from "lucide-react";
import { NavLink } from "react-router-dom";
import { GreetingHeader } from "@/components/mobile/MobileShell";
import { Avatar, QuickAction } from "@/components/mobile/Primitives";
import { announcements, assets, students } from "@/mockData";

export function ParentHomePage() {
  return (
    <>
      <GreetingHeader greeting="Xin chào," name="Chị Lan" initials="L" />
      <div className="card brand-grad mt-4 p-4 text-white">
        <div className="text-xs opacity-80">Hôm nay · Thứ Ba 26/05/2026</div>
        <div className="mt-1 text-xl font-bold">2 con đang đi học</div>
        <div className="mt-3 flex flex-wrap gap-2">
          <span className="badge bg-white/20 text-white">✓ Bé Minh - Có mặt</span>
          <span className="badge bg-white/20 text-white">⏰ Bé An - Đi muộn</span>
        </div>
      </div>
      <div className="mt-3 grid grid-cols-4 gap-2">
        <QuickAction icon={Receipt} label="Học phí" to="/parent/invoices" tone="red" />
        <QuickAction icon={Pill} label="Thuốc" to="/parent/medicine" tone="green" />
        <QuickAction icon={Soup} label="Thực đơn" to="/parent/menu" tone="orange" />
        <QuickAction icon={Calendar} label="Xin nghỉ" to="/parent/leave" tone="blue" />
      </div>
      <div className="section-title">Con của tôi</div>
      <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-2">
        {students.slice(0, 3).map((student) => (
          <NavLink key={student.id} to={`/parent/student/${student.id}`} className="card min-w-[150px] p-3 text-left">
            {student.image ? (
              <img src={student.image} alt={student.name} className="mb-2 h-20 w-full rounded-lg object-cover" />
            ) : (
              <Avatar initials={student.initials} size="xl" />
            )}
            <div className="text-sm font-semibold">{student.name}</div>
            <div className="text-xs text-slate-500">{student.className}</div>
          </NavLink>
        ))}
      </div>
      <div className="section-title">Khoảnh khắc hôm nay</div>
      <NavLink to="/parent/album" className="block text-left">
        <img src={assets.heroKids} className="hero-img mb-2" alt="Hoạt động lớp" />
        <div className="mb-2 text-xs text-slate-500">
          Bé Minh đang vẽ tranh cùng các bạn lớp Mầm A - cô Hà chia sẻ
        </div>
      </NavLink>
      <div className="section-title">Thông báo gần đây</div>
      <div className="space-y-2">
        {announcements.slice(0, 2).map((announcement) => (
          <NavLink key={announcement.id} to="/parent/announcements" className="card block p-3 text-left">
            <div className="flex items-start gap-3">
              <span className="badge b-peach">{announcement.scope}</span>
              <span className="ml-auto text-xs text-slate-400">{announcement.time}</span>
            </div>
            <div className="mt-1 text-sm font-semibold">{announcement.title}</div>
          </NavLink>
        ))}
      </div>
      <NavLink to="/parent/invoices" className="card mt-3 flex items-center gap-3 p-3 text-left">
        <div className="grid h-10 w-10 place-items-center rounded-full bg-red-100 text-red-600">
          <Receipt className="h-5 w-5" />
        </div>
        <div className="flex-1">
          <div className="text-sm font-semibold">2 hóa đơn chưa thanh toán</div>
          <div className="text-xs text-slate-500">Tổng 3.000.000 đ</div>
        </div>
      </NavLink>
    </>
  );
}
