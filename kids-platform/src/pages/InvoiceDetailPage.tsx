import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Link2, Printer } from "lucide-react";
import { Link, useParams } from "react-router-dom";
import { platform } from "@/api/platform";
import { InvoiceDocument } from "@/components/InvoiceDocument";
import { useToast } from "@/components/ui/Toast";

export function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const { toast } = useToast();
  const { data, isLoading, error } = useQuery({
    queryKey: ["invoice", id],
    queryFn: () => platform.getInvoice(id),
    enabled: !!id,
  });

  const share = async () => {
    if (!data?.publicToken) return;
    const url = `${window.location.origin}/hoa-don/${data.publicToken}`;
    try {
      await navigator.clipboard.writeText(url);
      toast("Đã chép link công khai");
    } catch {
      toast(url, "error");
    }
  };

  return (
    <>
      <header className="topbar no-print">
        <Link to="/invoices" className="btn-soft inline-flex items-center gap-2 text-sm">
          <ArrowLeft className="w-4 h-4" />
          Hóa đơn
        </Link>
        <div className="flex-1 font-bold text-slate-800">Chi tiết hóa đơn</div>
        <button className="btn-soft inline-flex items-center gap-2 text-sm" onClick={share} disabled={!data}>
          <Link2 className="w-4 h-4" />
          Chia sẻ link
        </button>
        <button
          className="btn-primary inline-flex items-center gap-2 text-sm"
          onClick={() => window.print()}
          disabled={!data}
        >
          <Printer className="w-4 h-4" />
          In hóa đơn
        </button>
      </header>

      <main className="p-6">
        {isLoading && <div className="text-muted">Đang tải…</div>}
        {error && <div className="text-red-600">Không tải được hóa đơn.</div>}
        {data && <InvoiceDocument doc={data} />}
      </main>
    </>
  );
}
