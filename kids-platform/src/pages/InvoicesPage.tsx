import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, formatDate, INVOICE_STATUS } from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

export function InvoicesPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [tenantId, setTenantId] = useState("");

  const { data, isLoading, error } = useQuery({
    queryKey: ["invoices"],
    queryFn: () => platform.listInvoices(1),
  });
  const tenants = useQuery({ queryKey: ["tenants", "picker"], queryFn: () => platform.listTenants(1) });

  const create = useMutation({
    mutationFn: () => platform.createInvoice(tenantId),
    onSuccess: () => {
      toast("Đã tạo hóa đơn kỳ mới");
      setOpen(false);
      setTenantId("");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Tạo hóa đơn thất bại", "error"),
  });

  const markPaid = useMutation({
    mutationFn: (id: string) => platform.markPaid(id),
    onSuccess: () => {
      toast("Đã đánh dấu thu");
      qc.invalidateQueries({ queryKey: ["invoices"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Thao tác thất bại", "error"),
  });

  const items = data ?? [];

  return (
    <>
      <PageHeader title="Hóa đơn nền tảng">
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Tạo hóa đơn kỳ
        </button>
      </PageHeader>

      <main className="p-6">
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Số hóa đơn</th>
                <th>Trường (ID)</th>
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
                const payable = inv.status !== "PAID" && inv.status !== "VOID";
                return (
                  <tr key={inv.id}>
                    <td className="font-medium">{inv.invoiceNumber ?? inv.id.slice(0, 8)}</td>
                    <td className="font-mono text-xs">{inv.tenantId.slice(0, 8)}…</td>
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
                          Đánh dấu thu
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

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo hóa đơn kỳ mới"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>Hủy</button>
            <button
              className="btn-primary text-sm"
              disabled={!tenantId || create.isPending}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Đang tạo…" : "Tạo hóa đơn"}
            </button>
          </>
        }
      >
        <Field label="Chọn trường">
          <select className="field" value={tenantId} onChange={(e) => setTenantId(e.target.value)}>
            <option value="">— Chọn trường —</option>
            {(tenants.data?.items ?? []).map((t) => (
              <option key={t.id} value={t.id}>
                {t.legalName ?? t.slug} ({t.slug})
              </option>
            ))}
          </select>
        </Field>
        <p className="text-xs text-slate-400">
          Tạo hóa đơn cho kỳ hiện tại của thuê bao trường đã chọn.
        </p>
      </Modal>
    </>
  );
}
