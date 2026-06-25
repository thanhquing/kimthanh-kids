import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Download, Search } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/http";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, formatDate, INVOICE_STATUS } from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const STATUSES = ["", "OPEN", "PAID", "OVERDUE", "VOID"];

/** VND → "156.2tr" / "0đ" cho KPI. */
function trShort(v?: number): string {
  if (!v) return "0đ";
  return `${parseFloat((v / 1_000_000).toFixed(1))}tr`;
}

export function InvoicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState("");
  const [search, setSearch] = useState("");
  const [debouncedQ, setDebouncedQ] = useState("");

  useEffect(() => {
    const id = setTimeout(() => setDebouncedQ(search.trim()), 350);
    return () => clearTimeout(id);
  }, [search]);

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices", status, debouncedQ],
    queryFn: () => platform.listInvoices(1, status || undefined, debouncedQ || undefined),
  });
  const { data: stats } = useQuery({
    queryKey: ["invoices", "stats"],
    queryFn: () => platform.invoiceStats(),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => platform.markPaid(id),
    onSuccess: () => {
      toast("Đã đánh dấu thu");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Thao tác thất bại", "error"),
  });

  const items = data?.items ?? [];

  function exportCsv() {
    const head = ["Số hóa đơn", "Trường", "Kỳ", "Tổng", "Trạng thái", "Hạn"];
    const lines = items.map((inv) =>
      [
        inv.invoiceNumber ?? inv.id,
        inv.tenantName ?? inv.tenantId,
        inv.period ?? "",
        inv.total ?? 0,
        badgeFor(INVOICE_STATUS, inv.status).label,
        formatDate(inv.dueDate),
      ]
        .map((c) => `"${String(c).replace(/"/g, '""')}"`)
        .join(","),
    );
    const blob = new Blob(["﻿" + [head.join(","), ...lines].join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "hoa-don-nen-tang.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <>
      <PageHeader section="Doanh thu" title="Hóa đơn nền tảng">
        <button className="btn-soft inline-flex items-center gap-2 text-sm" onClick={exportCsv}>
          <Download className="w-4 h-4" />
          Xuất CSV
        </button>
      </PageHeader>

      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <div className="kpi">
            <div className="num text-emerald-600">{stats ? trShort(stats.paidThisMonth) : "—"}</div>
            <div className="lbl">Đã thu (tháng này)</div>
          </div>
          <div className="kpi">
            <div className="num text-amber-600">{stats ? trShort(stats.openAmount) : "—"}</div>
            <div className="lbl">Chờ thu</div>
          </div>
          <div className="kpi">
            <div className="num text-red-600">{stats ? trShort(stats.overdueAmount) : "—"}</div>
            <div className="lbl">Quá hạn</div>
          </div>
          <div className="kpi">
            <div className="num">{stats?.total ?? "—"}</div>
            <div className="lbl">Tổng hóa đơn</div>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 mb-4">
          {STATUSES.map((s) => (
            <button
              key={s}
              className={cn("chip", status === s && "active")}
              onClick={() => setStatus(s)}
            >
              {s === "" ? "Tất cả" : (INVOICE_STATUS[s]?.label ?? s)}
            </button>
          ))}
          <div className="relative ml-auto w-64">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              className="field !pl-9 !py-1.5"
              placeholder="Tìm số HĐ / trường..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Số hóa đơn</th>
                <th>Trường</th>
                <th>Kỳ</th>
                <th>Tổng</th>
                <th>Trạng thái</th>
                <th>Hạn</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {isLoading && (
                <tr><td colSpan={7} className="!text-center text-muted">Đang tải…</td></tr>
              )}
              {error && (
                <tr><td colSpan={7} className="!text-center text-red-600">Không tải được.</td></tr>
              )}
              {!isLoading && !error && items.length === 0 && (
                <tr><td colSpan={7} className="!text-center text-muted">Chưa có hóa đơn.</td></tr>
              )}
              {items.map((inv) => {
                const st = badgeFor(INVOICE_STATUS, inv.status);
                const payable = inv.status === "OPEN" || inv.status === "OVERDUE";
                return (
                  <tr key={inv.id} className="hover:bg-[#fff8f3]">
                    <td className="font-mono text-xs font-semibold">{inv.invoiceNumber ?? inv.id.slice(0, 8)}</td>
                    <td>{inv.tenantName ?? inv.tenantId.slice(0, 8)}</td>
                    <td>{inv.period ?? "—"}</td>
                    <td className="font-semibold">{inv.total != null ? formatVnd(inv.total) : "—"}</td>
                    <td><span className={cn("badge", st.badge)}>{st.label}</span></td>
                    <td>{formatDate(inv.dueDate)}</td>
                    <td className="text-right">
                      {payable && (
                        <button
                          className="btn-soft !py-1 !px-3 text-xs"
                          disabled={markPaid.isPending}
                          onClick={() => markPaid.mutate(inv.id)}
                        >
                          Đánh dấu đã thu
                        </button>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </main>
    </>
  );
}
