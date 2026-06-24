import { AlertCircle, Building2, CircleCheck, Lock, Receipt, Search, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";

// LƯU Ý: trang này đang dùng DATA TĨNH khớp mock-ui (kids-landing/.../platform/dashboard.html).
// BE overview giàu dữ liệu (trial/overdue/suspended/MRR/phân bổ gói + MRR 12 tháng) làm sau,
// rồi thay các hằng số dưới đây bằng useQuery(platform.overview()).

function Kpi({
  icon: Icon,
  tint,
  num,
  label,
}: {
  icon: typeof Building2;
  tint: string;
  num: ReactNode;
  label: string;
}) {
  return (
    <div className="kpi">
      <div className={`w-9 h-9 rounded-xl grid place-items-center ${tint}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div className="num">{num}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

const NEW_TENANTS = [
  { initials: "MA", name: "Mầm non ABC", sub: "abc · còn 28 ngày dùng thử", badge: "Trial", badgeClass: "b-amber" },
  { initials: "HM", name: "Hoa Mai Montessori", sub: "hoamai · còn 21 ngày dùng thử", badge: "Trial", badgeClass: "b-amber" },
  { initials: "SV", name: "Sao Việt Kids", sub: "saoviet · đã lên gói Chuyên nghiệp", badge: "Active", badgeClass: "b-green" },
];

const OVERDUE_INVOICES = [
  { icon: Receipt, iconClass: "text-red-500", name: "PINV-2026-000118 · Little Stars", sub: "1.200.000đ · trễ 5 ngày", badge: "Quá hạn", badgeClass: "b-red" },
  { icon: Receipt, iconClass: "text-red-500", name: "PINV-2026-000121 · Rainbow Kids", sub: "3.240.000đ · trễ 2 ngày", badge: "Quá hạn", badgeClass: "b-red" },
  { icon: Lock, iconClass: "text-slate-400", name: "Eduplay+ · đã bị tạm khóa", sub: "Quá hạn 9 ngày", badge: "Suspended", badgeClass: "b-slate" },
];

export function DashboardPage() {
  return (
    <>
      <PageHeader title="Tổng quan">
        <div className="relative w-72">
          <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
          <input className="field !pl-9 !py-1.5" placeholder="Tìm trường, hóa đơn..." />
        </div>
      </PageHeader>

      <main className="p-6">
        {/* KPI */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-6">
          <Kpi icon={Building2} tint="bg-blue-50 text-blue-600" num={142} label="Tổng số trường" />
          <Kpi icon={CircleCheck} tint="bg-emerald-50 text-emerald-600" num={98} label="Đang hoạt động" />
          <Kpi icon={Sparkles} tint="bg-amber-50 text-amber-600" num={31} label="Đang dùng thử" />
          <Kpi icon={AlertCircle} tint="bg-red-50 text-red-600" num={9} label="Quá hạn" />
          <Kpi icon={Lock} tint="bg-slate-100 text-slate-500" num={4} label="Tạm khóa" />
          <Kpi
            icon={TrendingUp}
            tint="bg-pink-50 text-pink-600"
            num={
              <>
                168.4<span className="text-base font-semibold">tr</span>
              </>
            }
            label="MRR (đ/tháng)"
          />
        </div>

        {/* Charts */}
        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-5 lg:col-span-2">
            <div className="flex items-center justify-between mb-4">
              <div className="font-bold">Doanh thu định kỳ (MRR · 12 tháng)</div>
              <span className="badge b-green">+12.6%</span>
            </div>
            <svg viewBox="0 0 600 200" className="w-full h-48">
              <defs>
                <linearGradient id="g1" x1="0" x2="0" y1="0" y2="1">
                  <stop offset="0%" stopColor="#F26B5E" stopOpacity=".4" />
                  <stop offset="100%" stopColor="#F26B5E" stopOpacity="0" />
                </linearGradient>
              </defs>
              <polyline
                fill="url(#g1)"
                stroke="none"
                points="0,200 0,160 50,150 100,140 150,135 200,120 250,110 300,95 350,90 400,72 450,65 500,50 550,40 600,32 600,200"
              />
              <polyline
                fill="none"
                stroke="#F26B5E"
                strokeWidth="3"
                points="0,160 50,150 100,140 150,135 200,120 250,110 300,95 350,90 400,72 450,65 500,50 550,40 600,32"
              />
            </svg>
            <div className="flex justify-between text-xs text-slate-400 mt-1">
              {["T7", "T8", "T9", "T10", "T11", "T12", "T1", "T2", "T3", "T4", "T5", "T6"].map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3">Phân bổ theo gói</div>
            <div className="flex justify-center my-2">
              <div className="relative w-32 h-32">
                <svg viewBox="0 0 36 36" className="w-full h-full -rotate-90">
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#E2E8F0" strokeWidth="4" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F89A5B" strokeWidth="4" strokeDasharray="46 100" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#F26B5E" strokeWidth="4" strokeDasharray="38 100" strokeDashoffset="-46" />
                  <circle cx="18" cy="18" r="15.9" fill="none" stroke="#7BC796" strokeWidth="4" strokeDasharray="16 100" strokeDashoffset="-84" />
                </svg>
                <div className="absolute inset-0 grid place-items-center">
                  <div className="text-center">
                    <div className="text-2xl font-bold">142</div>
                    <div className="text-xs text-slate-400">Trường</div>
                  </div>
                </div>
              </div>
            </div>
            <div className="text-xs space-y-1 mt-3">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="status-dot bg-[#F89A5B]" />
                  Khởi đầu
                </span>
                <b>65</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="status-dot bg-[#F26B5E]" />
                  Chuyên nghiệp
                </span>
                <b>54</b>
              </div>
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-2">
                  <span className="status-dot bg-[#7BC796]" />
                  Hệ thống
                </span>
                <b>23</b>
              </div>
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-2 gap-5 mt-5">
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Trường mới đăng ký</div>
              <Link to="/tenants" className="text-xs text-[color:var(--primary)] font-semibold">
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {NEW_TENANTS.map((t) => (
                <div key={t.name} className="py-2.5 flex items-center gap-3">
                  <div className="avatar !w-8 !h-8 text-xs">{t.initials}</div>
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs text-slate-400">{t.sub}</div>
                  </div>
                  <span className={`badge ${t.badgeClass}`}>{t.badge}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold">Cần chú ý — hóa đơn quá hạn</div>
              <Link to="/invoices" className="text-xs text-[color:var(--primary)] font-semibold">
                Xem tất cả
              </Link>
            </div>
            <div className="divide-y divide-slate-100">
              {OVERDUE_INVOICES.map((inv) => (
                <div key={inv.name} className="py-2.5 flex items-center gap-3">
                  <inv.icon className={`w-4 h-4 ${inv.iconClass}`} />
                  <div className="flex-1">
                    <div className="text-sm font-semibold">{inv.name}</div>
                    <div className="text-xs text-slate-400">{inv.sub}</div>
                  </div>
                  <span className={`badge ${inv.badgeClass}`}>{inv.badge}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </main>
    </>
  );
}
