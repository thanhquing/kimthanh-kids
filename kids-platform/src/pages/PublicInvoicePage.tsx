import { useQuery } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useParams } from "react-router-dom";
import { platform } from "@/api/platform";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { useT } from "@/i18n";

/** Trang hóa đơn CÔNG KHAI — mở bằng link token, không cần đăng nhập. Cho trường xem + thanh toán. */
export function PublicInvoicePage() {
  const { t } = useT();
  const { token = "" } = useParams();
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => platform.getPublicInvoice(token),
    enabled: !!token,
    retry: false,
  });

  return (
    <div className="min-h-screen bg-[#F1F5F9]">
      <header className="no-print flex items-center justify-between px-6 h-14 bg-white border-b border-[#f4e7e0]">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg brand-grad grid place-items-center text-white font-bold text-sm">
            K
          </div>
          <span className="font-bold text-sm">{t("brand.name")}</span>
        </div>
        {data && (
          <button
            className="btn-primary inline-flex items-center gap-2 text-sm"
            onClick={() => window.print()}
          >
            <Printer className="w-4 h-4" />
            {t("inv.printPdf")}
          </button>
        )}
      </header>

      <main className="p-4 md:p-8">
        {isLoading && <div className="text-center text-muted py-10">{t("inv.loadingInvoice")}</div>}
        {error && (
          <div className="text-center py-10">
            <div className="font-bold text-slate-700">{t("inv.notFoundTitle")}</div>
            <div className="text-sm text-slate-400 mt-1">{t("inv.notFoundDesc")}</div>
          </div>
        )}
        {data && <InvoiceDocument doc={data} />}
      </main>
    </div>
  );
}
