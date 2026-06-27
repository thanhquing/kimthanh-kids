import { CreditCard } from "lucide-react";
import { useState } from "react";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { formatVnd } from "@/lib/utils";
import { invoices } from "@/mockData";

export function PaymentCheckoutPage() {
  const [bankOpen, setBankOpen] = useState(false);
  const { toast } = useToast();
  const total = invoices.slice(0, 2).reduce((sum, invoice) => sum + invoice.amount, 0);

  return (
    <>
      <TopBar title="Thanh toán" backTo="/parent/invoices" />
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="text-xs opacity-80">Tổng cần thanh toán</div>
        <div className="mt-1 text-3xl font-bold">{formatVnd(total)}</div>
        <div className="mt-2 text-xs opacity-80">2 hóa đơn · hạn gần nhất 31/05/2026</div>
      </div>
      <div className="section-title">Chi tiết khoản thu</div>
      <div className="card divide-y divide-slate-100">
        {invoices.slice(0, 2).map((invoice) => (
          <div key={invoice.id} className="flex items-center justify-between gap-3 p-3">
            <div>
              <div className="text-sm font-semibold">{invoice.studentName}</div>
              <div className="text-xs text-slate-500">{invoice.title}</div>
            </div>
            <div className="text-sm font-bold">{formatVnd(invoice.amount)}</div>
          </div>
        ))}
      </div>
      <div className="section-title">Phương thức thanh toán</div>
      <button type="button" onClick={() => setBankOpen(true)} className="card flex w-full items-center gap-3 p-3 text-left">
        <CreditCard className="h-5 w-5 text-[color:var(--primary)]" />
        <div className="flex-1">
          <div className="text-sm font-semibold">Chuyển khoản ngân hàng</div>
          <div className="text-xs text-slate-500">Hiển thị thông tin tài khoản trường</div>
        </div>
      </button>
      <button type="button" className="btn-primary mt-3 w-full" onClick={() => toast("Đã tạo yêu cầu xác nhận thanh toán")}>Tôi đã chuyển khoản</button>
      <BottomSheet open={bankOpen} title="Thông tin chuyển khoản" onClose={() => setBankOpen(false)}>
        <div className="space-y-2 text-sm">
          <InfoLine label="Ngân hàng" value="VCB - Trường Mầm non Hoa Sen" />
          <InfoLine label="Số TK" value="0123456789" />
          <InfoLine label="Nội dung" value="MINH AN HP T5 2026" />
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => {
              toast("Đã copy nội dung chuyển khoản");
              setBankOpen(false);
            }}
          >
            Copy nội dung
          </button>
        </div>
      </BottomSheet>
    </>
  );
}

