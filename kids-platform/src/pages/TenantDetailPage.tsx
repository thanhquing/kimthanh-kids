import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gauge, Info, Lock, LogIn, MapPin, Palette, Power, Receipt, Repeat, School } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type EntitlementInput } from "@/api/platform";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import {
  badgeFor,
  BILLING_MODE_LABEL,
  CYCLE_LABEL,
  formatDate,
  INVOICE_STATUS,
  METRIC_LABEL,
  SUB_STATUS,
  TENANCY_LABEL,
  TENANT_STATUS,
  TIER_LABEL,
} from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const METRICS = ["STUDENTS", "TEACHERS", "CLASSROOMS", "SCHOOLS", "STORAGE_MB", "ADMIN_USERS"];

// Cấu hình hiển thị quota (nhãn + màu). STORAGE_MB quy MB→GB khi show.
const QUOTA_META: Record<string, { label: string; color: string; unit?: string }> = {
  STUDENTS: { label: "Học sinh", color: "#F26B5E" },
  TEACHERS: { label: "Giáo viên", color: "#F89A5B" },
  CLASSROOMS: { label: "Lớp học", color: "#7BC796" },
  STORAGE_MB: { label: "Lưu trữ", color: "#60a5fa", unit: " GB" },
};

/** Quy đổi 1 dòng quota → {label, used, max, unit, pct} cho thanh hiển thị. */
function quotaView(q: { metric: string; used: number; limit: number | null }) {
  const meta = QUOTA_META[q.metric] ?? { label: q.metric, color: "#94a3b8" };
  const toGb = meta.unit === " GB";
  const used = toGb ? Math.round((q.used / 1024) * 10) / 10 : q.used;
  const max = q.limit == null ? null : toGb ? Math.round((q.limit / 1024) * 10) / 10 : q.limit;
  const pct = q.limit && q.limit > 0 ? Math.min(100, (q.used / q.limit) * 100) : 0;
  return { ...meta, used, max, pct };
}

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
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
    onSuccess: () => { toast("Đã ghi đè hạn mức"); setOvOpen(false); invalidate(); },
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

  if (isLoading || error || !t) {
    return (
      <>
        <Topbar />
        <main className="p-6 text-muted">
          {isLoading ? "Đang tải…" : <span className="text-red-600">Không tải được trường.</span>}
        </main>
      </>
    );
  }

  const st = badgeFor(TENANT_STATUS, t.status);
  const sub = t.subscription;
  const subSt = badgeFor(SUB_STATUS, sub?.status);
  const isSuspended = t.status === "SUSPENDED";
  const schools = t.schools ?? [];
  const customDomain = t.domains?.find((d) => !d.isPrimary);

  return (
    <>
      <Topbar onBack={() => navigate("/tenants")}>
        <button
          className="btn-soft inline-flex items-center gap-2 text-sm"
          disabled={impersonate.isPending}
          onClick={() => impersonate.mutate()}
        >
          <LogIn className="w-4 h-4" />
          Đăng nhập hộ
        </button>
        {isSuspended ? (
          <button
            className="btn-soft inline-flex items-center gap-2 text-sm !text-emerald-700"
            disabled={reactivate.isPending}
            onClick={() => reactivate.mutate()}
          >
            <Power className="w-4 h-4" />
            Mở khóa
          </button>
        ) : (
          <button
            className="btn-soft inline-flex items-center gap-2 text-sm !text-amber-700"
            disabled={suspend.isPending}
            onClick={() => suspend.mutate()}
          >
            <Lock className="w-4 h-4" />
            Tạm khóa
          </button>
        )}
        <button
          className="btn-primary inline-flex items-center gap-2 text-sm"
          disabled={createInvoice.isPending}
          onClick={() => createInvoice.mutate()}
        >
          <Receipt className="w-4 h-4" />
          Tạo hóa đơn
        </button>
      </Topbar>

      <main className="p-6 space-y-5">
        {/* Header trường */}
        <div className="card p-5 flex items-center gap-4">
          <div className="avatar !w-14 !h-14 text-lg">
            {(t.settings?.displayName ?? t.legalName ?? t.slug).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{t.settings?.displayName ?? t.legalName ?? t.slug}</h1>
              <span className={cn("badge", st.badge)}>{st.label}</span>
              <span className="badge b-blue">{TIER_LABEL[t.planTier] ?? t.planTier}</span>
            </div>
            <div className="text-sm text-slate-400 mt-0.5">
              {t.slug}.kimthanhkids.vn · {schools.length} cơ sở · {t.studentCount ?? 0} học sinh
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">MRR</div>
            <div className="text-xl font-bold">{formatVnd(t.mrr ?? 0)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Thông tin */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />Thông tin
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k="Tên pháp lý" v={t.legalName} />
              <Row k="Tên miền (slug)" v={t.slug} />
              <Row k="Mã trường" v={<span className="font-mono text-xs">{t.id}</span>} />
              <Row k="Ngày tạo" v={formatDate(t.createdAt)} />
              <Row k="Múi giờ" v={t.settings?.timezone ?? "Asia/Ho_Chi_Minh"} />
              <Row
                k="Chế độ vận hành"
                v={
                  <span className="badge b-slate">
                    {TENANCY_LABEL[t.tenancyMode ?? "POOL"] ?? t.tenancyMode}
                  </span>
                }
              />
            </dl>
          </div>

          {/* Thuê bao */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold flex items-center gap-2">
                <Repeat className="w-4 h-4 text-slate-400" />Thuê bao
              </div>
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k="Gói" v={sub?.plan ? (TIER_LABEL[sub.plan.tier] ?? sub.plan.name) : "—"} />
              <Row k="Chu kỳ" v={sub?.billingCycle ? (CYCLE_LABEL[sub.billingCycle] ?? sub.billingCycle) : "—"} />
              <Row k="Trạng thái" v={<span className={cn("badge", subSt.badge)}>{subSt.label}</span>} />
              <Row
                k="Kỳ hiện tại"
                v={
                  sub?.currentPeriodStart || sub?.currentPeriodEnd
                    ? `${formatDate(sub?.currentPeriodStart)} – ${formatDate(sub?.currentPeriodEnd)}`
                    : "—"
                }
              />
              <Row
                k="Thanh toán"
                v={
                  <span className="badge b-peach">
                    {BILLING_MODE_LABEL[sub?.billingMode ?? "GATEWAY"] ?? sub?.billingMode}
                  </span>
                }
              />
              <Row
                k="Tự gia hạn"
                v={
                  <span className={sub?.cancelAtPeriodEnd ? "text-slate-500" : "text-emerald-600 font-medium"}>
                    {sub?.cancelAtPeriodEnd ? "Tắt" : "Bật"}
                  </span>
                }
              />
            </dl>
          </div>

          {/* White-label */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-400" />Thương hiệu riêng
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k="Tên hiển thị" v={t.settings?.displayName ?? t.legalName} />
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">Màu chủ đạo</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-md border border-slate-200"
                    style={{ background: t.settings?.primaryColor ?? "#f26b5e" }}
                  />
                  <span className="font-mono text-xs">{t.settings?.primaryColor ?? "—"}</span>
                </dd>
              </div>
              <Row
                k="Logo"
                v={
                  t.settings?.logoUrl ? (
                    <span className="text-emerald-600 font-medium">Đã tải lên</span>
                  ) : (
                    <span className="text-slate-400">Chưa có</span>
                  )
                }
              />
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">Tên miền riêng</dt>
                <dd>
                  {customDomain ? (
                    <span className={cn("badge", customDomain.verifiedAt ? "b-green" : "b-amber")}>
                      {customDomain.verifiedAt ? "Đã xác minh" : "Chờ xác minh"}
                    </span>
                  ) : (
                    <span className="badge b-slate">Chưa cấu hình</span>
                  )}
                </dd>
              </div>
              {customDomain && (
                <div className="text-xs text-slate-400 pt-1">
                  {customDomain.domain}
                  {customDomain.verifiedAt ? "" : " — thêm bản ghi TXT để xác minh."}
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Quota */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />Hạn mức (quota)
            </div>
            <div className="space-y-3 text-sm">
              {(t.quota ?? []).map((q) => {
                const m = quotaView(q);
                return (
                  <div key={q.metric}>
                    <div className="flex justify-between mb-1">
                      <span>{m.label}</span>
                      <b>
                        {m.used} / {m.max ?? "∞"}
                        {m.unit ?? ""}
                      </b>
                    </div>
                    <div className="h-2 rounded-full bg-slate-100">
                      <div
                        className="h-2 rounded-full"
                        style={{ width: `${m.pct}%`, background: m.color }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
            <button className="btn-soft w-full mt-4 text-sm" onClick={() => setOvOpen(true)}>
              Ghi đè hạn mức
            </button>
          </div>

          {/* Cơ sở */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />Cơ sở ({schools.length})
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {schools.length === 0 && <div className="py-2.5 text-muted">Chưa có cơ sở.</div>}
              {schools.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fff3ec] text-[color:var(--primary)] grid place-items-center">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{s.name ?? "Cơ sở"}</div>
                    <div className="text-xs text-slate-400">
                      {s.code ?? "—"} · {s._count?.students ?? 0} học sinh · {s._count?.classrooms ?? 0} lớp
                    </div>
                  </div>
                  <span className={cn("badge", s.status === "CLOSED" ? "b-slate" : "b-green")}>
                    {s.status === "CLOSED" ? "Đã đóng" : "Đang mở"}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-3">
              Gói Hệ thống mới được thêm nhiều cơ sở (chuỗi).
            </div>
          </div>

          {/* Hóa đơn gần đây */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />Hóa đơn gần đây
              </div>
              <Link to="/invoices" className="text-xs text-[color:var(--primary)] font-semibold">
                Tất cả
              </Link>
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
        </div>
      </main>

      <Modal
        open={ovOpen}
        onClose={() => setOvOpen(false)}
        title="Ghi đè hạn mức"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOvOpen(false)}>Hủy</button>
            <button className="btn-primary text-sm" disabled={override.isPending} onClick={() => override.mutate()}>
              {override.isPending ? "Đang lưu…" : "Lưu thay đổi"}
            </button>
          </>
        }
      >
        <Field label="Loại hạn mức">
          <select
            className="field"
            value={ov.metric}
            onChange={(e) => setOv({ ...ov, metric: e.target.value })}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>{METRIC_LABEL[m] ?? m}</option>
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

/** Topbar riêng cho trang chi tiết: back-link thay tiêu đề, không có avatar (khớp mock). */
function Topbar({ onBack, children }: { onBack?: () => void; children?: ReactNode }) {
  return (
    <header className="topbar">
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        Trường thuê
      </button>
      <div className="flex-1" />
      {children}
    </header>
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
