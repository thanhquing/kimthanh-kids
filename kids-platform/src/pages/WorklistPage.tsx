import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, CircleCheck, Clock, Lock, Receipt, Sparkles, TrendingUp } from "lucide-react";
import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { useToast } from "@/components/ui/Toast";
import { badgeFor, formatDate, SUB_STATUS } from "@/lib/labels";
import { formatVnd } from "@/lib/utils";

function Stat({
  icon: Icon,
  tint,
  num,
  label,
}: {
  icon: typeof Sparkles;
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

export function WorklistPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["worklist"], queryFn: () => platform.worklist() });

  const markPaid = useMutation({
    mutationFn: (id: string) => platform.markPaid(id),
    onSuccess: () => {
      toast("Đã đánh dấu hóa đơn đã thu");
      qc.invalidateQueries({ queryKey: ["worklist"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Thao tác thất bại", "error"),
  });

  const t = data?.trial;
  const d = data?.dunning;
  const n = (v?: number): ReactNode => (isLoading ? "…" : (v ?? 0));

  return (
    <>
      <PageHeader title="Cần hành động" section="Vận hành" />

      <main className="p-6 space-y-6">
        {/* ── Phễu dùng thử ── */}
        <section>
          <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
            <Sparkles className="w-4 h-4 text-[color:var(--primary)]" />
            Phễu dùng thử
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
            <Stat icon={Sparkles} tint="bg-amber-50 text-amber-600" num={n(t?.active)} label="Đang dùng thử" />
            <Stat icon={Clock} tint="bg-red-50 text-red-600" num={n(t?.expiringSoon)} label="Sắp hết hạn (≤7 ngày)" />
            <Stat
              icon={TrendingUp}
              tint="bg-emerald-50 text-emerald-600"
              num={isLoading ? "…" : `${t?.conversionRate ?? 0}%`}
              label={`Tỷ lệ chuyển đổi (${t?.converted ?? 0}/${t?.endedTotal ?? 0})`}
            />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Trường</th>
                    <th>Gói</th>
                    <th>Hết hạn</th>
                    <th>Còn lại</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (t?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={5} className="!text-center text-muted">Không có trường nào đang dùng thử.</td></tr>
                  )}
                  {(t?.items ?? []).map((it) => (
                    <tr key={it.tenantId} className="hover:bg-[#fff8f3]">
                      <td className="font-semibold">{it.tenantName ?? it.tenantId.slice(0, 8)}</td>
                      <td>{it.planName ?? "—"}</td>
                      <td className="text-slate-500">{formatDate(it.trialEndsAt)}</td>
                      <td>
                        <span
                          className={`badge ${it.daysLeft != null && it.daysLeft <= 3 ? "b-red" : "b-amber"}`}
                        >
                          {it.daysLeft != null ? `${it.daysLeft} ngày` : "—"}
                        </span>
                      </td>
                      <td className="text-right">
                        <Link
                          to={`/tenants/${it.tenantId}`}
                          className="text-xs text-[color:var(--primary)] font-semibold"
                        >
                          Xem
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* ── Công nợ cần thu ── */}
        <section>
          <div className="flex items-center gap-2 font-bold text-slate-700 mb-3">
            <Receipt className="w-4 h-4 text-[color:var(--primary)]" />
            Công nợ cần thu
          </div>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            <Stat icon={AlertCircle} tint="bg-red-50 text-red-600" num={n(d?.overdueCount)} label="Hóa đơn quá hạn" />
            <Stat
              icon={Receipt}
              tint="bg-pink-50 text-pink-600"
              num={isLoading ? "…" : `${((d?.overdueAmount ?? 0) / 1_000_000).toFixed(1)}tr`}
              label="Tổng tiền cần thu"
            />
            <Stat icon={Clock} tint="bg-amber-50 text-amber-600" num={n(d?.atRiskSuspend)} label="Quá hạn (sắp khóa)" />
            <Stat icon={Lock} tint="bg-slate-100 text-slate-500" num={n(d?.suspended)} label="Đang tạm khóa" />
          </div>
          <div className="card overflow-hidden">
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Số HĐ</th>
                    <th>Trường</th>
                    <th>Cần thu</th>
                    <th>Hạn</th>
                    <th>Trễ</th>
                    <th>Trạng thái</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {!isLoading && (d?.items.length ?? 0) === 0 && (
                    <tr><td colSpan={7} className="!text-center text-muted">Không có công nợ quá hạn. 🎉</td></tr>
                  )}
                  {(d?.items ?? []).map((it) => {
                    const b = badgeFor(SUB_STATUS, it.subStatus ?? undefined);
                    return (
                      <tr key={it.invoiceId} className="hover:bg-[#fff8f3]">
                        <td className="font-mono text-xs">{it.invoiceNumber}</td>
                        <td className="font-semibold">{it.tenantName ?? it.tenantId.slice(0, 8)}</td>
                        <td className="font-semibold">{formatVnd(it.amountDue)}</td>
                        <td className="text-slate-500">{formatDate(it.dueAt)}</td>
                        <td>
                          <span className="badge b-red">{it.daysLate ?? 0} ngày</span>
                        </td>
                        <td>
                          <span className={`badge ${b.badge}`}>{b.label}</span>
                        </td>
                        <td className="text-right">
                          <button
                            className="btn-soft text-xs"
                            disabled={markPaid.isPending}
                            onClick={() => markPaid.mutate(it.invoiceId)}
                          >
                            <CircleCheck className="w-3.5 h-3.5 inline -mt-0.5 mr-1" />
                            Đã thu
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
          <p className="text-xs text-slate-400 mt-3">
            Hệ thống tự chuyển trạng thái theo lịch (quá hạn → tạm khóa → hủy). Trang này để{" "}
            <b>chủ động liên hệ thu tiền trước khi khóa</b>. Nhắc tự động qua email sẽ thêm khi dựng
            kênh email.
          </p>
        </section>
      </main>
    </>
  );
}
