import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type CreatePlanInput, type Plan } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TIER_BADGE, TIER_LABEL } from "@/lib/labels";
import { invalidatePlatformData } from "@/lib/queries";
import { cn, formatVnd } from "@/lib/utils";

const FEAT_LABEL: Record<string, string> = {
  messaging: "Nhắn tin GV↔PH",
  media_gallery: "Album ảnh lớp",
  lesson_plan: "Giáo án",
  analytics: "Phân tích nâng cao",
  api_access: "API truy cập",
};
const TIERS = ["FREE", "STARTER", "PRO", "ENTERPRISE", "CUSTOM"];
const EMPTY: CreatePlanInput = { code: "", name: "", tier: "STARTER", isPublic: true };

/** Rút gọn tiền theo triệu: 3.240.000 → "3.24tr". */
function short(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toLocaleString("vi-VN")}tr`;
  return formatVnd(n);
}

/** Giá hiển thị lớn + dòng phụ chu kỳ — suy ra từ prices/tier/trialDays. */
function priceInfo(p: Plan): { big: string; sub: string } {
  const monthly = p.prices?.find((x) => x.billingCycle === "MONTHLY")?.amount ?? 0;
  const quarterly = p.prices?.find((x) => x.billingCycle === "QUARTERLY")?.amount ?? 0;
  const annual = p.prices?.find((x) => x.billingCycle === "ANNUAL")?.amount ?? 0;

  let big: string;
  if (monthly > 0) big = formatVnd(monthly);
  else if (p.tier === "FREE") big = "Miễn phí";
  else if (p.tier === "CUSTOM") big = "Hợp đồng";
  else big = "Liên hệ";

  const parts: string[] = [];
  if (monthly > 0) parts.push("/tháng");
  if (quarterly > 0) parts.push(`quý ${short(quarterly)}`);
  if (annual > 0) parts.push(`năm ${short(annual)}`);
  let sub: string;
  if (parts.length) sub = parts.join(" · ");
  else if (p.tier === "FREE") sub = "Dùng mãi · không hết hạn";
  else if (p.tier === "CUSTOM") sub = "Deploy riêng (SILO) · white-label";
  else sub = "Giá thỏa thuận";
  if (p.trialDays && p.trialDays > 0) sub = `Dùng thử ${p.trialDays} ngày · ${sub}`;
  return { big, sub };
}

const LIMIT_ORDER = ["STUDENTS", "TEACHERS", "CLASSROOMS", "STORAGE_MB"] as const;
const LIMIT_UNIT: Record<string, string> = { STUDENTS: "HS", TEACHERS: "GV", CLASSROOMS: "lớp" };

/** "300 HS · 25 GV · 20 lớp · 20GB" — null = bỏ qua; rỗng = "Không giới hạn". */
function formatLimits(limits: Plan["limits"]): string {
  const byMetric = new Map((limits ?? []).map((l) => [l.metric, l.limitValue]));
  const parts: string[] = [];
  for (const m of LIMIT_ORDER) {
    const v = byMetric.get(m);
    if (v == null) continue;
    if (m === "STORAGE_MB") parts.push(`${Math.round(v / 1024)}GB`);
    else parts.push(`${v} ${LIMIT_UNIT[m]}`);
  }
  return parts.length ? parts.join(" · ") : "Không giới hạn";
}

export function PlansPage() {
  const qc = useQueryClient();
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
      const prices = monthly
        ? [{ billingCycle: "MONTHLY", currency: "VND", amount: Number(monthly) }]
        : undefined;
      if (editing) {
        return platform.updatePlan(editing.id, {
          name: form.name,
          isPublic: form.isPublic,
          trialDays: form.trialDays,
          prices,
        });
      }
      return platform.createPlan({ ...form, prices });
    },
    onSuccess: () => {
      toast(editing ? "Đã cập nhật gói dịch vụ" : "Đã tạo gói dịch vụ");
      setOpen(false);
      qc.invalidateQueries({ queryKey: ["plans"] });
      invalidatePlatformData(qc); // đổi giá gói → MRR đổi ở Tổng quan/Trường/Thuê bao
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Lưu gói thất bại", "error"),
  });

  return (
    <>
      <PageHeader title="Gói dịch vụ" section="Cấu hình">
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={openCreate}>
          <Plus className="w-4 h-4" />
          Thêm gói
        </button>
      </PageHeader>

      <main className="p-6">
        {isLoading && <div className="text-muted">Đang tải…</div>}
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
                  {popular ? (
                    <span className="badge b-green">Phổ biến</span>
                  ) : !p.isPublic ? (
                    <span className="badge b-slate">Ẩn</span>
                  ) : null}
                </div>
                <div className="font-bold text-lg mt-3">{p.name}</div>
                <div className="text-2xl font-bold mt-1">{big}</div>
                <div className="text-xs text-slate-400">{sub}</div>
                <div className="text-xs text-slate-400 mt-2">
                  {p.tenantCount ?? 0} trường đang dùng
                </div>
                <div className="border-t border-slate-100 my-3" />
                <div className="text-sm space-y-1.5 flex-1">
                  {Object.keys(FEAT_LABEL).map((k) => {
                    const on = enabledFeats.has(k);
                    return (
                      <div key={k} className={cn("flex items-center gap-2", !on && "text-slate-300")}>
                        {on ? (
                          <Check className="w-4 h-4 text-emerald-500" />
                        ) : (
                          <X className="w-4 h-4 text-slate-300" />
                        )}
                        {FEAT_LABEL[k]}
                      </div>
                    );
                  })}
                </div>
                <div className="text-xs text-slate-500 bg-[#fff8f3] rounded-lg p-2.5 mt-3">
                  <b>Hạn mức:</b> {formatLimits(p.limits)}
                </div>
                <button className="btn-soft w-full mt-3 text-sm" onClick={() => openEdit(p)}>
                  Sửa gói
                </button>
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-5">
          Mỗi gói gồm: giá theo chu kỳ (tháng/quý/năm), feature flag bật/tắt tính năng, và hạn mức
          (quota) theo metric. Sửa gói không ảnh hưởng thuê bao đang chạy cho tới kỳ kế.
        </p>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={editing ? `Sửa gói — ${editing.name}` : "Tạo gói dịch vụ"}
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>Hủy</button>
            <button
              className="btn-primary text-sm"
              disabled={save.isPending || !form.code || !form.name}
              onClick={() => save.mutate()}
            >
              {save.isPending ? "Đang lưu…" : editing ? "Lưu thay đổi" : "Tạo gói"}
            </button>
          </>
        }
      >
        <Field label="Mã gói (code)">
          <input
            className="field"
            value={form.code}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, code: e.target.value })}
          />
        </Field>
        <Field label="Tên gói">
          <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Bậc (tier)">
          <select
            className="field"
            value={form.tier}
            disabled={!!editing}
            onChange={(e) => setForm({ ...form, tier: e.target.value })}
          >
            {TIERS.map((t) => (
              <option key={t} value={t}>
                {t} — {TIER_LABEL[t]}
              </option>
            ))}
          </select>
        </Field>
        <Field label="Giá / tháng (đ) — tùy chọn">
          <input
            className="field"
            type="number"
            value={monthly}
            onChange={(e) => setMonthly(e.target.value)}
            placeholder="vd: 1200000"
          />
        </Field>
        <Field label="Số ngày dùng thử — tùy chọn">
          <input
            className="field"
            type="number"
            value={form.trialDays ?? ""}
            onChange={(e) => setForm({ ...form, trialDays: e.target.value ? Number(e.target.value) : undefined })}
            placeholder="vd: 30"
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isPublic ?? true}
            onChange={(e) => setForm({ ...form, isPublic: e.target.checked })}
          />
          Hiển thị công khai (bán)
        </label>
      </Modal>
    </>
  );
}
