import { Calendar } from "lucide-react";
import { NavLink } from "react-router-dom";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { formatVnd } from "@/lib/utils";
import { invoices } from "@/mockData";

export function InvoicesPage() {
  return (
    <>
      <TopBar title="Học phí" backTo="/parent" />
      <div className="mb-3 mt-3 flex gap-2 overflow-x-auto">
        <span className="chip active">Chưa thanh toán (2)</span>
        <span className="chip">Đã thanh toán</span>
        <span className="chip">Tất cả</span>
      </div>
      <div className="space-y-3">
        {invoices.map((invoice) => (
          <div key={invoice.id} className="card p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="font-semibold">{invoice.title}</div>
              <StatusBadge status={invoice.status} />
            </div>
            <div className="text-xs text-slate-500">{invoice.studentName}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{formatVnd(invoice.amount)}</div>
            <div className="mt-1 text-xs text-slate-500">
              <Calendar className="inline h-3 w-3" /> Hạn: {invoice.dueDate}
            </div>
            <NavLink to="/parent/payment" className="btn-soft mt-3 block w-full text-center text-sm">
              {invoice.status === "Đã thanh toán" ? "Xem biên nhận" : "Thanh toán / liên hệ trường"}
            </NavLink>
          </div>
        ))}
      </div>
    </>
  );
}

