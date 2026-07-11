import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type CreatePlanInput, type Plan } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { t as tr, useT, type TKey } from "@/i18n";
import { TIER_BADGE, tierLabel } from "@/lib/labels";
import { invalidatePlatformData } from "@/lib/queries";
import { cn, formatVnd } from "@/lib/utils";

const FEAT_KEYS = ["messaging", "media_gallery", "lesson_plan", "analytics", "api_access"];
const FEAT_LABEL_KEY: Record<string, TKey> = {
  messaging: "pl.feat.messaging",
  media_gallery: "pl.feat.media_gallery",
  lesson_plan: "pl.feat.lesson_plan",
  analytics: "pl.feat.analytics",
  api_access: "pl.feat.api_access",
};
const TIERS = ["FREE", "STARTER", "PRO", "ENTERPRISE", "CUSTOM"];
const EMPTY: CreatePlanInput = { code: "", name: "", tier: "STARTER", isPublic: true };

/** Rút gọn tiền theo triệu: 3.240.000 → "3.24tr" (vi) / "3.24M" (en). */
function short(n: number): string {
  if (n >= 1_000_000)
    return `${(n / 1_000_000).toLocaleString(tr("dash.monthsShort") === "M" ? "en-US" : "vi-VN")}${tr("dash.millionsUnit")}`;
  return formatVnd(n);
}

/** Giá hiển thị lớn + dòng phụ chu kỳ — suy ra từ prices/tier/trialDays. */
function priceInfo(p: Plan): { big: string; sub: string } {
  const monthly = p.prices?.find((x) => x.billingCycle === "MONTHLY")?.amount ?? 0;
  const quarterly = p.prices?.find((x) => x.billingCycle === "QUARTERLY")?.amount ?? 0;
  const annual = p.prices?.find((x) => x.billingCycle === "ANNUAL")?.amount ?? 0;

  let big: string;
  if (monthly > 0) big = formatVnd(monthly);
  else if (p.tier === "FREE") big = tr("pl.priceFree");
  else if (p.tier === "CUSTOM") big = tr("pl.priceContract");
  else big = tr("pl.priceContact");

  const parts: string[] = [];
  if (monthly > 0) parts.push(tr("pl.perMonth"));
  if (quarterly > 0) parts.push(tr("pl.perQuarter", { amount: short(quarterly) }));
  if (annual > 0) parts.push(tr("pl.perYear", { amount: short(annual) }));
  let sub: string;
  if (parts.length) sub = parts.join(" · ");
  else if (p.tier === "FREE") sub = tr("pl.subFree");
  else if (p.tier === "CUSTOM") sub = tr("pl.subCustom");
  else sub = tr("pl.subNegotiable");
  if (p.trialDays && p.trialDays > 0) sub = tr("pl.trialPrefix", { days: p.trialDays, sub });
  return { big, sub };
}

const LIMIT_ORDER = ["STUDENTS", "TEACHERS", "CLASSROOMS", "STORAGE_MB"] as const;
const LIMIT_UNIT_KEY: Record<string, TKey> = {
  STUDENTS: "pl.limitStudents",
  TEACHERS: "pl.limitTeachers",
  CLASSROOMS: "pl.limitClassrooms",
};

/** "300 HS · 25 GV · 20 lớp · 20GB" — null = bỏ qua; rỗng = "Không giới hạn". */
function formatLimits(limits: Plan["limits"]): string {
  const byMetric = new Map((limits ?? []).map((l) => [l.metric, l.limitValue]));
  const parts: string[] = [];
  for (const m of LIMIT_ORDER) {
    const v = byMetric.get(m);
    if (v == null) continue;
    if (m === "STORAGE_MB") parts.push(`${Math.round(v / 1024)}GB`);
    else parts.push(`${v} ${tr(LIMIT_UNIT_KEY[m])}`);
  }
  return parts.length ? parts.join(" · ") : tr("pl.unlimited");
}

export function PlansPage() {
  const qc = useQueryClient();
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Plan | null>(null);
  const [form, setForm] = useState<CreatePlanInput>(EMPTY);
  const [monthly, setMonthly] = useState("");

  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => platform.listPlans() });

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY);
    setMonthly("");
    setOpen(true);
  };
  const openEdit = (p: Plan) => {
    setEditing(p);
    setForm({ code: p.code, name: p.name, tier: p.tier, isPublic: p.isPublic, trialDays: p.trialDays });
    setMonthly(String(p.prices?.find((x) => x.billingCycle === "MONTHLY")?.amount ?? ""));
    setOpen(true);
  };

  const save = useMutation({
    mutationFn: () => {
      const monthlyNum = monthly ? Number(monthly) : undefined;
      if (editing) {
        // Chỉ gửi prices khi giá tháng THỰC SỰ đổi → tránh PLAN_IMMUTABLE khi chỉ sửa tên/trial/public
        // của gói đã có thuê bao (đổi giá phải tạo phiên bản gói mới — BL-050).
        const currentMonthly = editing.prices?.find((x) => x.billingCycle === "MONTHLY")?.amount;
        const priceChanged = monthlyNum != null && monthlyNum !== Number(currentMonthly ?? NaN);
        return platform.updatePlan(editing.id, {
          name: form.name,
          isPublic: form.isPublic,
          trialDays: form.trialDays,
          prices: priceChanged
            ? [{ billingCycle: "MONTHLY", currency: "VND", amount: monthlyNum! }]
            : undefined,
        });
      }
      return platform.createPlan({
        ...form,
        prices: monthlyNum
          ? [{ billingCycle: "MONTHLY", currency: "VND", amount: monthlyNum }]
          : undefined,
      });
    },
    onSuccess: () => {
      toast(editing ? t("pl.toastUpdated") : t("pl.toastCreated"));
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["plans"] });
      invalidatePlatformData(qc); // đổi giá gói → MRR đổi ở Tổng quan/Trường/Thuê bao
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("pl.toastErr"), "error"),
  });

  const lifecycle = useMutation({
    mutationFn: (v: { kind: "feature" | "deactivate" | "delete"; id: string }): Promise<unknown> =>
      v.kind === "feature"
        ? platform.setPlanFeatured(v.id)
        : v.kind === "deactivate"
          ? platform.deactivatePlan(v.id)
          : platform.deletePlan(v.id),
    onSuccess: (_d, v) => {
      toast(
        v.kind === "feature"
          ? t("pl.toastFeatured")
          : v.kind === "deactivate"
            ? t("pl.toastDeactivated")
            : t("pl.toastDeleted"),
      );
      qc.invalidateQueries({ queryKey: ["plans"] });
      invalidatePlatformData(qc);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("pl.toastErr"), "error"),
  });

  return (
    <>
      <PageHeader title={t("nav.plans")} section={t("navGroups.config")}>
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          {t("pl.add")}
        </button>
      </PageHeader>

      <main className="p-6">
        {isLoading && <div className="text-muted">{t("common.loading")}</div>}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(plans ?? []).map((p) => {
            const enabledFeats = new Set(
              (p.features ?? []).filter((f) => f.enabled).map((f) => f.featureKey),
            );
            const { big, sub } = priceInfo(p);
            const popular = p.tier === "PRO";
            return (
              <div
                key={p.id}
                className={cn(
                  "card p-5 flex flex-col",
                  popular && "ring-2 ring-[color:var(--primary)]",
                )}
              >
                <div className="flex items-center justify-between">
                  <span className={cn("badge", TIER_BADGE[p.tier] ?? "b-slate")}>{p.tier}</span>
                  <div className="flex items-center gap-1.5">
                    {p.isFeatured && <span className="badge b-blue">{t("pl.featured")}</span>}
                    {popular ? (
                      <span className="badge b-green">{t("pl.popular")}</span>
                    ) : !p.isPublic ? (
                      <span className="badge b-slate">{t("pl.hidden")}</span>
                    ) : null}
                  </div>
                </div>
                <div className="font-bold text-lg mt-3">{p.name}</div>
                <div className="text-2xl font-bold mt-1">{big}</div>
                <div className="text-xs text-slate-400">{sub}</div>
                <div className="text-xs text-slate-400 mt-2">
                  {t("pl.tenantsUsing", { n: p.tenantCount ?? 0 })}
                </div>
                <div className="border-t border-slate-100 my-3" />
                <div className="text-sm space-y-1.5 flex-1">
                  {FEAT_KEYS.map((k) => {
                    const on = enabledFeats.has(k);
                    return (
                      <div key={k} className={cn("flex items-center gap-2", !on && "text-slate-300")}>
                        {on ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300" />
                        )}
                        {t(FEAT_LABEL_KEY[k])}
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-500 bg-[#fff8f3] rounded-lg p-2.5 mt-3">
                  <b>{t("pl.limitsLabel")}</b> {formatLimits(p.limits)}
                </div>
                <button className="btn-soft w-full mt-3 text-sm" onClick={() => openEdit(p)}>
                  {t("pl.editPlan")}
                </button>
                <div className="flex flex-wrap gap-2 mt-2">
                  {!p.isFeatured && p.isActive !== false && p.isPublic && (
                    <button
                      className="btn-soft flex-1 text-xs"
                      disabled={lifecycle.isPending}
                      onClick={() => lifecycle.mutate({ kind: "feature", id: p.id })}
                    >
                      {t("pl.setFeatured")}
                    </button>
                  )}
                  {p.isActive !== false && (
                    <button
                      className="btn-soft flex-1 text-xs"
                      disabled={lifecycle.isPending}
                      onClick={() => {
                        if (window.confirm(t("pl.confirmDeactivate", { name: p.name })))
                          lifecycle.mutate({ kind: "deactivate", id: p.id });
                      }}
                    >
                      {t("pl.deactivate")}
                    </button>
                  )}
                  {!p.tenantCount && (
                    <button
                      className="btn-soft flex-1 text-xs text-red-600"
                      disabled={lifecycle.isPending}
                      onClick={() => {
                        if (window.confirm(t("pl.confirmDelete", { name: p.name })))
                          lifecycle.mutate({ kind: "delete", id: p.id });
                      }}
                    >
                      {t("pl.deletePlan")}
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-5">{t("pl.pageHint")}</p>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? t("pl.modalEdit", { name: editing.name }) : t("pl.modalCreate")}
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button
              className="btn-primary text-sm"
              disabled={save.isPending || !form.code || !form.name}
              onClick={() => save.mutate()}
            >
              {save.isPending ? t("common.saving") : editing ? t("td.saveChanges") : t("pl.createSubmit")}
            </button>
          </>
        }
      >
        <Field label={t("pl.fCode")}>
          <input
            className="field"
            value={form.code}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label={t("pl.fName")}>
          <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label={t("pl.fTier")}>
          <select
            className="field"
            value={form.tier}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            {TIERS.map((tier) => (
              <option key={tier} value={tier}>
                {tier} — {tierLabel(tier)}
              </option>
            ))}
          </select>
        </Field>
        <Field label={t("pl.fMonthly")}>
          <input
            className="field"
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder={t("pl.fMonthlyPh")}
          />
        </Field>
        <Field label={t("pl.fTrialDays")}>
          <input
            className="field"
            type="number"
            value={form.trialDays ?? ""}
            onChange={(e) => setForm({ ...form, trialDays: e.target.value ? Number(e.target.value) : undefined })}
            placeholder={t("pl.fTrialDaysPh")}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isPublic ?? true}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          {t("pl.fPublic")}
        </label>
      </Modal>
    </>
  );
}
