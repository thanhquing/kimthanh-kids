import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Plus, X } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type CreatePlanInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { TIER_LABEL } from "@/lib/labels";
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

export function PlansPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreatePlanInput>(EMPTY);
  const [monthly, setMonthly] = useState("");

  const { data: plans, isLoading } = useQuery({ queryKey: ["plans"], queryFn: () => platform.listPlans() });

  const create = useMutation({
    mutationFn: () =>
      platform.createPlan({
        ...form,
        prices: monthly
          ? [{ billingCycle: "MONTHLY", currency: "VND", amount: Number(monthly) }]
          : undefined,
      }),
    onSuccess: () => {
      toast("Đã tạo gói dịch vụ");
      setOpen(false);
      setForm(EMPTY);
      setMonthly("");
      qc.invalidateQueries({ queryKey: ["plans"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Tạo gói thất bại", "error"),
  });

  return (
    <>
      <PageHeader title="Gói dịch vụ">
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Tạo gói mới
        </button>
      </PageHeader>

      <main className="p-6">
        {isLoading && <div className="text-muted">Đang tải…</div>}
        <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-5">
          {(plans ?? []).map((p) => {
            const monthlyPrice = p.prices?.find((x) => x.billingCycle === "MONTHLY")?.amount;
            const enabledFeats = new Set(
              (p.features ?? []).filter((f) => f.enabled).map((f) => f.featureKey),
            );
            return (
              <div key={p.id} className="card p-5 flex flex-col">
                <div className="flex items-center justify-between">
                  <span className="badge b-blue">{p.tier}</span>
                  {!p.isPublic && <span className="badge b-slate">Ẩn</span>}
                </div>
                <div className="font-bold text-lg mt-3">{p.name}</div>
                <div className="text-2xl font-bold mt-1">
                  {monthlyPrice != null ? formatVnd(monthlyPrice) : TIER_LABEL[p.tier] === "Miễn phí" ? "Miễn phí" : "Liên hệ"}
                </div>
                <div className="text-xs text-slate-400">{p.code}</div>
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
                {p.limits && p.limits.length > 0 && (
                  <div className="text-xs text-slate-500 bg-[#fff8f3] rounded-lg p-2.5 mt-3">
                    <b>Hạn mức:</b>{" "}
                    {p.limits.map((l) => `${l.metric}:${l.limitValue ?? "∞"}`).join(" · ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
        <p className="text-xs text-slate-400 mt-5">
          Mỗi gói gồm: giá theo chu kỳ, feature flag, và hạn mức theo metric. Sửa gói không ảnh
          hưởng thuê bao đang chạy cho tới kỳ kế.
        </p>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo gói dịch vụ"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>Hủy</button>
            <button
              className="btn-primary text-sm"
              disabled={create.isPending || !form.code || !form.name}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Đang tạo…" : "Tạo gói"}
            </button>
          </>
        }
      >
        <Field label="Mã gói (code)">
          <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <Field label="Tên gói">
          <input className="field" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
        </Field>
        <Field label="Bậc (tier)">
          <select className="field" value={form.tier} onChange={(e) => setForm({ ...form, tier: e.target.value })}>
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
