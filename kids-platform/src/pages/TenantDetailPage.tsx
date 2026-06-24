import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Gauge, Info, LogIn, Power, Repeat } from "lucide-react";
import { useState, type ReactNode } from "react";
import { useParams } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type EntitlementInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  badgeFor,
  CYCLE_LABEL,
  formatDate,
  INVOICE_STATUS,
  SUB_STATUS,
  TENANT_STATUS,
  TIER_LABEL,
} from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const METRICS = ["STUDENTS", "TEACHERS", "CLASSROOMS", "SCHOOLS", "STORAGE_MB", "ADMIN_USERS"];

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ovOpen, setOvOpen] = useState(false);
  const [ov, setOv] = useState<EntitlementInput>({ metric: "STUDENTS", limitValue: 0, reason: "" });

  const { data: t, isLoading, error } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => platform.getTenant(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tenant", id] });
    qc.invalidateQueries({ queryKey: ["tenants"] });
  };
  const onErr = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : "Thao tác thất bại", "error");

  const suspend = useMutation({
    mutationFn: () => platform.suspend(id),
    onSuccess: () => { toast("Đã tạm khóa trường"); invalidate(); },
    onError: onErr,
  });
  const reactivate = useMutation({
    mutationFn: () => platform.reactivate(id),
    onSuccess: () => { toast("Đã mở khóa trường"); invalidate(); },
    onError: onErr,
  });
  const impersonate = useMutation({
    mutationFn: () => platform.impersonate(id),
    onSuccess: (res) => toast(`Đã tạo phiên impersonate cho ${res.tenant?.slug ?? "trường"} (mở kids-crm để vào)`),
    onError: onErr,
  });
  const override = useMutation({
    mutationFn: () => platform.setEntitlement(id, ov),
    onSuccess: () => { toast("Đã override hạn mức"); setOvOpen(false); invalidate(); },
    onError: onErr,
  });
  const createInvoice = useMutation({
    mutationFn: () => platform.createInvoice(id),
    onSuccess: () => { toast("Đã tạo hóa đơn kỳ"); invalidate(); },
    onError: onErr,
  });
  const markPaid = useMutation({
    mutationFn: (invId: string) => platform.markPaid(invId),
    onSuccess: () => { toast("Đã đánh dấu thu"); invalidate(); },
    onError: onErr,
  });

  if (isLoading) return (<><PageHeader title="Chi tiết trường" /><main className="p-6 text-muted">Đang tải…</main></>);
  if (error || !t) return (<><PageHeader title="Chi tiết trường" /><main className="p-6 text-red-600">Không tải được trường.</main></>);

  const st = badgeFor(TENANT_STATUS, t.status);
  const sub = t.subscription;
  const subSt = badgeFor(SUB_STATUS, sub?.status);
  const isSuspended = t.status === "SUSPENDED";

  return (
    <>
      <PageHeader title="Chi tiết trường">
        <button
          className="btn-soft inline-flex items-center gap-2 text-sm"
          disabled={impersonate.isPending}
          onClick={() => impersonate.mutate()}
        >
          <LogIn className="w-4 h-4" />
          Impersonate
        </button>
        {isSuspended ? (
          <button
            className="btn-primary inline-flex items-center gap-2 text-sm"
            disabled={reactivate.isPending}
            onClick={() => reactivate.mutate()}
          >
            <Power className="w-4 h-4" />
            Mở khóa
          </button>
        ) : (
          <button
            className="btn-soft inline-flex items-center gap-2 text-sm !text-red-600"
            disabled={suspend.isPending}
            onClick={() => suspend.mutate()}
          >
            <Power className="w-4 h-4" />
            Tạm khóa
          </button>
        )}
      </PageHeader>

      <main className="p-6 space-y-5">
        <div className="card p-5 flex items-center gap-4">
          <div className="avatar !w-14 !h-14 text-lg">
            {(t.legalName ?? t.slug).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{t.legalName ?? t.slug}</h1>
              <span className={cn("badge", st.badge)}>{st.label}</span>
              <span className="badge b-blue">{TIER_LABEL[t.planTier] ?? t.planTier}</span>
            </div>
            <div className="text-sm text-slate-400 mt-0.5">
              {t.slug}.kimthanhkids.vn · {t.schools?.length ?? t._count?.schools ?? 0} cơ sở
            </div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />Thông tin
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k="Tên pháp lý" v={t.legalName} />
              <Row k="Slug" v={t.slug} />
              <Row k="Tenant ID" v={<span className="font-mono text-xs">{t.id}</span>} />
              <Row k="Ngày tạo" v={formatDate(t.createdAt)} />
              <Row k="Chế độ" v={<span className="badge b-slate">{t.tenancyMode ?? "POOL"}</span>} />
            </dl>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Repeat className="w-4 h-4 text-slate-400" />Thuê bao
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k="Gói" v={sub?.plan ? (TIER_LABEL[sub.plan.tier] ?? sub.plan.name) : "—"} />
              <Row k="Chu kỳ" v={sub?.billingCycle ? (CYCLE_LABEL[sub.billingCycle] ?? sub.billingCycle) : "—"} />
              <Row k="Trạng thái" v={<span className={cn("badge", subSt.badge)}>{subSt.label}</span>} />
              <Row k="Hết hạn kỳ" v={formatDate(sub?.currentPeriodEnd)} />
            </dl>
          </div>

          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />Hạn mức (quota)
            </div>
            <p className="text-sm text-slate-500">
              Override hạn mức/feature riêng cho trường này (vd nâng giới hạn HS, bật tính năng).
            </p>
            <button className="btn-soft w-full mt-4 text-sm" onClick={() => setOvOpen(true)}>
              Override hạn mức
            </button>
          </div>
        </div>

        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="font-bold flex items-center gap-2">Hóa đơn gần đây</div>
            <button
              className="btn-soft !py-1 !px-3 text-xs"
              disabled={createInvoice.isPending}
              onClick={() => createInvoice.mutate()}
            >
              Tạo hóa đơn kỳ
            </button>
          </div>
          <div className="divide-y divide-slate-100 text-sm">
            {(sub?.invoices ?? []).length === 0 && (
              <div className="py-2.5 text-muted">Chưa có hóa đơn.</div>
            )}
            {(sub?.invoices ?? []).map((inv) => {
              const ist = badgeFor(INVOICE_STATUS, inv.status);
              const payable = inv.status !== "PAID" && inv.status !== "VOID";
              return (
                <div key={inv.id} className="py-2.5 flex items-center justify-between">
                  <div>
                    <div className="font-medium">{inv.invoiceNumber ?? inv.id.slice(0, 8)}</div>
                    <div className="text-xs text-slate-400">
                      {inv.period ?? "—"} · {inv.total != null ? formatVnd(inv.total) : "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={cn("badge", ist.badge)}>{ist.label}</span>
                    {payable && (
                      <button
                        className="btn-soft !py-1 !px-2 text-xs"
                        disabled={markPaid.isPending}
                        onClick={() => markPaid.mutate(inv.id)}
                      >
                        Thu
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </main>

      <Modal
        open={ovOpen}
        onClose={() => setOvOpen(false)}
        title="Override hạn mức"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOvOpen(false)}>Hủy</button>
            <button className="btn-primary text-sm" disabled={override.isPending} onClick={() => override.mutate()}>
              {override.isPending ? "Đang lưu…" : "Lưu override"}
            </button>
          </>
        }
      >
        <Field label="Metric">
          <select
            className="field"
            value={ov.metric}
            onChange={(e) => setOv({ ...ov, metric: e.target.value })}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>{m}</option>
            ))}
          </select>
        </Field>
        <Field label="Giới hạn mới (để trống = không giới hạn)">
          <input
            className="field"
            type="number"
            value={ov.limitValue ?? ""}
            onChange={(e) =>
              setOv({ ...ov, limitValue: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </Field>
        <Field label="Lý do">
          <input
            className="field"
            value={ov.reason ?? ""}
            onChange={(e) => setOv({ ...ov, reason: e.target.value })}
          />
        </Field>
      </Modal>
    </>
  );
}

function Row({ k, v }: { k: string; v: ReactNode }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-slate-400">{k}</dt>
      <dd className="font-medium text-right">{v ?? "—"}</dd>
    </div>
  );
}
