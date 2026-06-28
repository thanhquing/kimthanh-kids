import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Gauge, Info, Lock, LogIn, MapPin, Palette, Power, Receipt, Repeat, School } from "lucide-react";
import { useState, type ReactNode } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ApiError } from "@/api/http";
import { platform, type EntitlementInput } from "@/api/platform";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import {
  badgeFor,
  billingModeLabel,
  cycleLabel,
  formatDate,
  INVOICE_STATUS,
  metricLabel,
  SUB_STATUS,
  tenancyLabel,
  TENANT_STATUS,
  tierLabel,
} from "@/lib/labels";
import { invalidatePlatformData } from "@/lib/queries";
import { cn, formatVnd } from "@/lib/utils";

const METRICS = ["STUDENTS", "TEACHERS", "CLASSROOMS", "SCHOOLS", "STORAGE_MB", "ADMIN_USERS"];

// Màu + đơn vị hiển thị quota (nhãn lấy từ metricLabel để song ngữ). STORAGE_MB quy MB→GB.
const QUOTA_META: Record<string, { color: string; unit?: string }> = {
  STUDENTS: { color: "#F26B5E" },
  TEACHERS: { color: "#F89A5B" },
  CLASSROOMS: { color: "#7BC796" },
  STORAGE_MB: { color: "#60a5fa", unit: " GB" },
};

/** Quy đổi 1 dòng quota → {label, used, max, unit, pct} cho thanh hiển thị. */
function quotaView(q: { metric: string; used: number; limit: number | null }) {
  const meta = QUOTA_META[q.metric] ?? { color: "#94a3b8" };
  const toGb = meta.unit === " GB";
  const used = toGb ? Math.round((q.used / 1024) * 10) / 10 : q.used;
  const max = q.limit == null ? null : toGb ? Math.round((q.limit / 1024) * 10) / 10 : q.limit;
  const pct = q.limit && q.limit > 0 ? Math.min(100, (q.used / q.limit) * 100) : 0;
  return { ...meta, label: metricLabel(q.metric), used, max, pct };
}

export function TenantDetailPage() {
  const { id = "" } = useParams();
  const navigate = useNavigate();
  const { t } = useT();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [ovOpen, setOvOpen] = useState(false);
  const [ov, setOv] = useState<EntitlementInput>({ metric: "STUDENTS", limitValue: 0, reason: "" });

  const { data: tenant, isLoading, error } = useQuery({
    queryKey: ["tenant", id],
    queryFn: () => platform.getTenant(id),
    enabled: !!id,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["tenant", id] });
    invalidatePlatformData(qc); // gồm cả ["tenants"]
  };
  const onErr = (e: unknown) =>
    toast(e instanceof ApiError ? e.message : t("td.toastErr"), "error");

  const suspend = useMutation({
    mutationFn: () => platform.suspend(id),
    onSuccess: () => { toast(t("td.toastSuspended")); invalidate(); },
    onError: onErr,
  });
  const reactivate = useMutation({
    mutationFn: () => platform.reactivate(id),
    onSuccess: () => { toast(t("td.toastReactivated")); invalidate(); },
    onError: onErr,
  });
  const impersonate = useMutation({
    mutationFn: () => platform.impersonate(id),
    onSuccess: (res) =>
      toast(t("td.toastImpersonate", { slug: res.tenant?.slug ?? t("td.slugFallback") })),
    onError: onErr,
  });
  const override = useMutation({
    mutationFn: () => platform.setEntitlement(id, ov),
    onSuccess: () => { toast(t("td.toastOverride")); setOvOpen(false); invalidate(); },
    onError: onErr,
  });
  const createInvoice = useMutation({
    mutationFn: () => platform.createInvoice(id),
    onSuccess: () => { toast(t("td.toastInvoice")); invalidate(); },
    onError: onErr,
  });
  const markPaid = useMutation({
    mutationFn: (invId: string) => platform.markPaid(invId),
    onSuccess: () => { toast(t("td.toastPaid")); invalidate(); },
    onError: onErr,
  });

  if (isLoading || error || !tenant) {
    return (
      <>
        <Topbar onBack={() => navigate("/tenants")} backLabel={t("td.back")} />
        <main className="p-6 text-muted">
          {isLoading ? t("common.loading") : <span className="text-red-600">{t("td.loadError")}</span>}
        </main>
      </>
    );
  }

  const st = badgeFor(TENANT_STATUS, tenant.status);
  const sub = tenant.subscription;
  const subSt = badgeFor(SUB_STATUS, sub?.status);
  const isSuspended = tenant.status === "SUSPENDED";
  const schools = tenant.schools ?? [];
  const customDomain = tenant.domains?.find((d) => !d.isPrimary);

  return (
    <>
      <Topbar onBack={() => navigate("/tenants")} backLabel={t("td.back")}>
        <button
          className="btn-soft inline-flex items-center gap-2 text-sm"
          disabled={impersonate.isPending}
          onClick={() => impersonate.mutate()}
        >
          <LogIn className="w-4 h-4" />
          {t("td.impersonate")}
        </button>
        {isSuspended ? (
          <button
            className="btn-soft inline-flex items-center gap-2 text-sm !text-emerald-700"
            disabled={reactivate.isPending}
            onClick={() => reactivate.mutate()}
          >
            <Power className="w-4 h-4" />
            {t("td.unlock")}
          </button>
        ) : (
          <button
            className="btn-soft inline-flex items-center gap-2 text-sm !text-amber-700"
            disabled={suspend.isPending}
            onClick={() => suspend.mutate()}
          >
            <Lock className="w-4 h-4" />
            {t("td.suspend")}
          </button>
        )}
        <button
          className="btn-primary inline-flex items-center gap-2 text-sm"
          disabled={createInvoice.isPending}
          onClick={() => createInvoice.mutate()}
        >
          <Receipt className="w-4 h-4" />
          {t("td.createInvoice")}
        </button>
      </Topbar>

      <main className="p-6 space-y-5">
        {/* Header trường */}
        <div className="card p-5 flex items-center gap-4">
          <div className="avatar !w-14 !h-14 text-lg">
            {(tenant.settings?.displayName ?? tenant.legalName ?? tenant.slug).slice(0, 2).toUpperCase()}
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold">{tenant.settings?.displayName ?? tenant.legalName ?? tenant.slug}</h1>
              <span className={cn("badge", st.badge)}>{st.label}</span>
              <span className="badge b-blue">{tierLabel(tenant.planTier)}</span>
            </div>
            <div className="text-sm text-slate-400 mt-0.5">
              {tenant.slug}.kimthanhkids.vn ·{" "}
              {t("td.subtitleMeta", { schools: schools.length, students: tenant.studentCount ?? 0 })}
            </div>
          </div>
          <div className="text-right">
            <div className="text-xs text-slate-400">MRR</div>
            <div className="text-xl font-bold">{formatVnd(tenant.mrr ?? 0)}</div>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Thông tin */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Info className="w-4 h-4 text-slate-400" />{t("td.info")}
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k={t("td.legalName")} v={tenant.legalName} />
              <Row
                k={t("td.taxCode")}
                v={
                  tenant.taxCode ? (
                    <span className="inline-flex items-center gap-1.5">
                      <span className="font-mono text-xs">{tenant.taxCode}</span>
                      {tenant.taxVerifiedAt ? (
                        <span className="badge b-green">{t("td.verified")}</span>
                      ) : (
                        <span className="badge b-amber">{t("td.unverified")}</span>
                      )}
                    </span>
                  ) : (
                    "—"
                  )
                }
              />
              <Row k={t("td.domainSlug")} v={tenant.slug} />
              <Row
                k={t("td.code")}
                v={tenant.code ? <span className="font-mono text-xs">{tenant.code}</span> : "—"}
              />
              <Row k={t("td.tenantId")} v={<span className="font-mono text-xs">{tenant.id}</span>} />
              <Row k={t("td.createdAt")} v={formatDate(tenant.createdAt)} />
              <Row k={t("td.timezone")} v={tenant.settings?.timezone ?? "Asia/Ho_Chi_Minh"} />
              <Row
                k={t("td.tenancyMode")}
                v={<span className="badge b-slate">{tenancyLabel(tenant.tenancyMode ?? "POOL")}</span>}
              />
            </dl>
          </div>

          {/* Thuê bao */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold flex items-center gap-2">
                <Repeat className="w-4 h-4 text-slate-400" />{t("td.sub")}
              </div>
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k={t("td.plan")} v={sub?.plan ? (tierLabel(sub.plan.tier) ?? sub.plan.name) : "—"} />
              <Row k={t("td.cycle")} v={sub?.billingCycle ? cycleLabel(sub.billingCycle) : "—"} />
              <Row k={t("common.status")} v={<span className={cn("badge", subSt.badge)}>{subSt.label}</span>} />
              <Row
                k={t("td.currentPeriod")}
                v={
                  sub?.currentPeriodStart || sub?.currentPeriodEnd
                    ? `${formatDate(sub?.currentPeriodStart)} – ${formatDate(sub?.currentPeriodEnd)}`
                    : "—"
                }
              />
              <Row
                k={t("td.payment")}
                v={<span className="badge b-peach">{billingModeLabel(sub?.billingMode ?? "GATEWAY")}</span>}
              />
              <Row
                k={t("td.autoRenew")}
                v={
                  <span className={sub?.cancelAtPeriodEnd ? "text-slate-500" : "text-emerald-600 font-medium"}>
                    {sub?.cancelAtPeriodEnd ? t("td.off") : t("td.on")}
                  </span>
                }
              />
            </dl>
          </div>

          {/* White-label */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Palette className="w-4 h-4 text-slate-400" />{t("td.branding")}
            </div>
            <dl className="text-sm space-y-2.5">
              <Row k={t("td.displayName")} v={tenant.settings?.displayName ?? tenant.legalName} />
              <div className="flex items-center justify-between">
                <dt className="text-slate-400">{t("td.primaryColor")}</dt>
                <dd className="flex items-center gap-2">
                  <span
                    className="w-5 h-5 rounded-md border border-slate-200"
                    style={{ background: tenant.settings?.primaryColor ?? "#f26b5e" }}
                  />
                  <span className="font-mono text-xs">{tenant.settings?.primaryColor ?? "—"}</span>
                </dd>
              </div>
              <Row
                k={t("td.logo")}
                v={
                  tenant.settings?.logoUrl ? (
                    <span className="text-emerald-600 font-medium">{t("td.uploaded")}</span>
                  ) : (
                    <span className="text-slate-400">{t("td.notSet")}</span>
                  )
                }
              />
              <div className="flex justify-between items-center">
                <dt className="text-slate-400">{t("td.customDomain")}</dt>
                <dd>
                  {customDomain ? (
                    <span className={cn("badge", customDomain.verifiedAt ? "b-green" : "b-amber")}>
                      {customDomain.verifiedAt ? t("td.verified") : t("td.pendingVerify")}
                    </span>
                  ) : (
                    <span className="badge b-slate">{t("td.notConfigured")}</span>
                  )}
                </dd>
              </div>
              {customDomain && (
                <div className="text-xs text-slate-400 pt-1">
                  {customDomain.domain}
                  {customDomain.verifiedAt ? "" : t("td.txtHint")}
                </div>
              )}
            </dl>
          </div>
        </div>

        <div className="grid lg:grid-cols-3 gap-5">
          {/* Quota */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />{t("td.quota")}
            </div>
            <div className="space-y-3 text-sm">
              {(tenant.quota ?? []).map((q) => {
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
              {t("td.overrideQuota")}
            </button>
          </div>

          {/* Cơ sở */}
          <div className="card p-5">
            <div className="font-bold mb-3 flex items-center gap-2">
              <MapPin className="w-4 h-4 text-slate-400" />{t("td.schools", { n: schools.length })}
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {schools.length === 0 && <div className="py-2.5 text-muted">{t("td.noSchools")}</div>}
              {schools.map((s) => (
                <div key={s.id} className="py-2.5 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#fff3ec] text-[color:var(--primary)] grid place-items-center">
                    <School className="w-4 h-4" />
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold">{s.name ?? t("td.schoolFallback")}</div>
                    <div className="text-xs text-slate-400">
                      {s.code ?? "—"} ·{" "}
                      {t("td.schoolMeta", {
                        students: s._count?.students ?? 0,
                        classrooms: s._count?.classrooms ?? 0,
                      })}
                    </div>
                  </div>
                  <span className={cn("badge", s.status === "CLOSED" ? "b-slate" : "b-green")}>
                    {s.status === "CLOSED" ? t("td.schoolClosed") : t("td.schoolOpen")}
                  </span>
                </div>
              ))}
            </div>
            <div className="text-xs text-slate-400 mt-3">{t("td.schoolsHint")}</div>
          </div>

          {/* Hóa đơn gần đây */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-3">
              <div className="font-bold flex items-center gap-2">
                <Receipt className="w-4 h-4 text-slate-400" />{t("td.recentInvoices")}
              </div>
              <Link to="/invoices" className="text-xs text-[color:var(--primary)] font-semibold">
                {t("common.all")}
              </Link>
            </div>
            <div className="divide-y divide-slate-100 text-sm">
              {(sub?.invoices ?? []).length === 0 && (
                <div className="py-2.5 text-muted">{t("td.noInvoices")}</div>
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
                          {t("td.collect")}
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
        title={t("td.overrideQuota")}
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOvOpen(false)}>{t("common.cancel")}</button>
            <button className="btn-primary text-sm" disabled={override.isPending} onClick={() => override.mutate()}>
              {override.isPending ? t("common.saving") : t("td.saveChanges")}
            </button>
          </>
        }
      >
        <Field label={t("td.ovMetric")}>
          <select
            className="field"
            value={ov.metric}
            onChange={(e) => setOv({ ...ov, metric: e.target.value })}
          >
            {METRICS.map((m) => (
              <option key={m} value={m}>{metricLabel(m)}</option>
            ))}
          </select>
        </Field>
        <Field label={t("td.ovLimit")}>
          <input
            className="field"
            type="number"
            value={ov.limitValue ?? ""}
            onChange={(e) =>
              setOv({ ...ov, limitValue: e.target.value === "" ? null : Number(e.target.value) })
            }
          />
        </Field>
        <Field label={t("td.ovReason")}>
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
function Topbar({
  onBack,
  backLabel,
  children,
}: {
  onBack?: () => void;
  backLabel?: string;
  children?: ReactNode;
}) {
  return (
    <header className="topbar">
      <button
        onClick={onBack}
        className="text-slate-400 hover:text-slate-600 flex items-center gap-1 text-sm"
      >
        <ArrowLeft className="w-4 h-4" />
        {backLabel}
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
