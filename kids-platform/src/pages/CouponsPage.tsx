import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { platform, type Coupon, type CreateCouponInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { t as tr, useT } from "@/i18n";
import { formatDate } from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const EMPTY: CreateCouponInput = { code: "", kind: "PERCENT", amount: 0, duration: "ONCE", isActive: true };

function kindLabel(kind: string): string {
  if (kind === "PERCENT") return tr("cp.kindPercent");
  if (kind === "FIXED_AMOUNT") return tr("cp.kindFixed");
  return kind;
}

/** "Áp dụng": ONCE→"1 kỳ", REPEATING→"N kỳ đầu" (theo durationCount), FOREVER→"Mọi kỳ". */
function durationText(c: Coupon): string {
  if (c.duration === "FOREVER") return tr("cp.durForever");
  if (c.duration === "REPEATING")
    return c.durationCount ? tr("cp.durRepeatN", { n: c.durationCount }) : tr("cp.durRepeat");
  return tr("cp.durOnce");
}

/** "Hiệu lực": hết lượt → "đã hết lượt"; có hạn → "đến DATE"; còn lại → "không giới hạn". */
function validityText(c: Coupon): string {
  const used = c.redeemedCount ?? 0;
  if (c.maxRedemptions != null && used >= c.maxRedemptions) return tr("cp.valExhausted");
  if (c.validUntil) return tr("cp.valUntil", { date: formatDate(c.validUntil) });
  return tr("cp.valUnlimited");
}

function valueText(c: Coupon): string {
  const amount = Number(c.amount);
  return c.kind === "PERCENT" ? `-${amount}%` : `-${formatVnd(amount)}`;
}

export function CouponsPage() {
  const qc = useQueryClient();
  const { t } = useT();
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<CreateCouponInput>(EMPTY);

  const { data, isLoading, error } = useQuery({
    queryKey: ["coupons"],
    queryFn: () => platform.listCoupons(1),
  });

  const create = useMutation({
    mutationFn: () => platform.createCoupon({ ...form, amount: Number(form.amount) }),
    onSuccess: () => {
      toast(t("cp.toastCreated"));
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const items = data ?? [];

  return (
    <>
      <PageHeader title={t("nav.coupons")} section={t("navGroups.revenue")}>
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          {t("cp.create")}
        </button>
      </PageHeader>

      <main className="p-6">
        <div className="card overflow-hidden">
          <div className="overflow-x-auto">
          <table className="table">
            <thead>
              <tr>
                <th>{t("cp.colCode")}</th>
                <th>{t("cp.colKind")}</th>
                <th>{t("cp.colValue")}</th>
                <th>{t("cp.colDuration")}</th>
                <th>{t("cp.colRedeemed")}</th>
                <th>{t("cp.colValidity")}</th>
                <th>{t("common.status")}</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="!text-center text-muted">{t("common.loading")}</td></tr>}
              {error && <tr><td colSpan={7} className="!text-center text-red-600">{t("cp.loadError")}</td></tr>}
              {!isLoading && !error && items.length === 0 && (
                <tr><td colSpan={7} className="!text-center text-muted">{t("cp.empty")}</td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-[#fff8f3]">
                  <td>
                    <span className="font-mono font-semibold bg-[#fff3ec] text-[color:var(--primary)] px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </td>
                  <td>{kindLabel(c.kind)}</td>
                  <td className="font-semibold">{valueText(c)}</td>
                  <td>{durationText(c)}</td>
                  <td>
                    {c.redeemedCount ?? 0} / {c.maxRedemptions ?? "∞"}
                  </td>
                  <td>{validityText(c)}</td>
                  <td>
                    <span className={cn("badge", c.isActive ? "b-green" : "b-slate")}>
                      {c.isActive ? t("cp.active") : t("cp.inactive")}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={t("cp.modalTitle")}
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>{t("common.cancel")}</button>
            <button
              className="btn-primary text-sm"
              disabled={create.isPending || !form.code || !form.amount}
              onClick={() => create.mutate()}
            >
              {create.isPending ? t("cp.creating") : t("cp.create")}
            </button>
          </>
        }
      >
        <Field label={t("cp.fCode")}>
          <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cp.fKind")}>
            <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="PERCENT">{t("cp.optPercent")}</option>
              <option value="FIXED_AMOUNT">{t("cp.optFixed")}</option>
            </select>
          </Field>
          <Field label={form.kind === "PERCENT" ? t("cp.fValuePercent") : t("cp.fValueFixed")}>
            <input
              className="field"
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label={t("cp.fDuration")}>
            <select className="field" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
              <option value="ONCE">{t("cp.optOnce")}</option>
              <option value="REPEATING">{t("cp.optRepeating")}</option>
              <option value="FOREVER">{t("cp.optForever")}</option>
            </select>
          </Field>
          {form.duration === "REPEATING" ? (
            <Field label={t("cp.fDurationCount")}>
              <input
                className="field"
                type="number"
                value={form.durationCount ?? ""}
                onChange={(e) => setForm({ ...form, durationCount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder={t("cp.fDurationCountPh")}
              />
            </Field>
          ) : (
            <Field label={t("cp.fMaxRedemptions")}>
              <input
                className="field"
                type="number"
                value={form.maxRedemptions ?? ""}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : undefined })}
                placeholder={t("cp.fMaxRedemptionsPh")}
              />
            </Field>
          )}
        </div>
        <Field label={t("cp.fValidUntil")}>
          <input
            className="field"
            type="date"
            value={form.validUntil ?? ""}
            onChange={(e) => setForm({ ...form, validUntil: e.target.value || undefined })}
          />
        </Field>
        <label className="flex items-center gap-2 text-sm text-slate-600">
          <input
            type="checkbox"
            checked={form.isActive ?? true}
            onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
          />
          {t("cp.activateNow")}
        </label>
      </Modal>
    </>
  );
}
