import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type Coupon, type CreateCouponInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { PERCENT: "Phần trăm", FIXED_AMOUNT: "Cố định" };
const EMPTY: CreateCouponInput = { code: "", kind: "PERCENT", amount: 0, duration: "ONCE", isActive: true };

/** "Áp dụng": ONCE→"1 kỳ", REPEATING→"N kỳ đầu" (theo durationCount), FOREVER→"Mọi kỳ". */
function durationText(c: Coupon): string {
  if (c.duration === "FOREVER") return "Mọi kỳ";
  if (c.duration === "REPEATING") return c.durationCount ? `${c.durationCount} kỳ đầu` : "Lặp lại";
  return "1 kỳ";
}

/** "Hiệu lực": hết lượt → "đã hết lượt"; có hạn → "đến DATE"; còn lại → "không giới hạn". */
function validityText(c: Coupon): string {
  const used = c.redeemedCount ?? 0;
  if (c.maxRedemptions != null && used >= c.maxRedemptions) return "đã hết lượt";
  if (c.validUntil) return `đến ${formatDate(c.validUntil)}`;
  return "không giới hạn";
}

function valueText(c: Coupon): string {
  const amount = Number(c.amount);
  return c.kind === "PERCENT" ? `-${amount}%` : `-${formatVnd(amount)}`;
}

export function CouponsPage() {
  const qc = useQueryClient();
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
      toast("Đã tạo mã giảm giá");
      setOpen(false);
      setForm(EMPTY);
      qc.invalidateQueries({ queryKey: ["coupons"] });
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : "Tạo coupon thất bại", "error"),
  });

  const items = data ?? [];

  return (
    <>
      <PageHeader title="Mã giảm giá" section="Doanh thu">
        <button className="btn-primary inline-flex items-center gap-2 text-sm" onClick={() => setOpen(true)}>
          <Plus className="w-4 h-4" />
          Tạo mã
        </button>
      </PageHeader>

      <main className="p-6">
        <div className="card overflow-hidden">
          <table className="table">
            <thead>
              <tr>
                <th>Mã</th>
                <th>Loại</th>
                <th>Giá trị</th>
                <th>Áp dụng</th>
                <th>Lượt dùng</th>
                <th>Hiệu lực</th>
                <th>Trạng thái</th>
              </tr>
            </thead>
            <tbody>
              {isLoading && <tr><td colSpan={7} className="!text-center text-muted">Đang tải…</td></tr>}
              {error && <tr><td colSpan={7} className="!text-center text-red-600">Không tải được.</td></tr>}
              {!isLoading && !error && items.length === 0 && (
                <tr><td colSpan={7} className="!text-center text-muted">Chưa có mã giảm giá.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id} className="hover:bg-[#fff8f3]">
                  <td>
                    <span className="font-mono font-semibold bg-[#fff3ec] text-[color:var(--primary)] px-2 py-0.5 rounded">
                      {c.code}
                    </span>
                  </td>
                  <td>{KIND_LABEL[c.kind] ?? c.kind}</td>
                  <td className="font-semibold">{valueText(c)}</td>
                  <td>{durationText(c)}</td>
                  <td>
                    {c.redeemedCount ?? 0} / {c.maxRedemptions ?? "∞"}
                  </td>
                  <td>{validityText(c)}</td>
                  <td>
                    <span className={cn("badge", c.isActive ? "b-green" : "b-slate")}>
                      {c.isActive ? "Đang chạy" : "Ngừng"}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </main>

      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Tạo mã giảm giá"
        footer={
          <>
            <button className="btn-soft text-sm" onClick={() => setOpen(false)}>Hủy</button>
            <button
              className="btn-primary text-sm"
              disabled={create.isPending || !form.code || !form.amount}
              onClick={() => create.mutate()}
            >
              {create.isPending ? "Đang tạo…" : "Tạo mã"}
            </button>
          </>
        }
      >
        <Field label="Mã (code)">
          <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại">
            <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="PERCENT">Phần trăm (%)</option>
              <option value="FIXED_AMOUNT">Cố định (đ)</option>
            </select>
          </Field>
          <Field label={form.kind === "PERCENT" ? "Giá trị (%)" : "Giá trị (đ)"}>
            <input
              className="field"
              type="number"
              value={form.amount || ""}
              onChange={(e) => setForm({ ...form, amount: Number(e.target.value) })}
            />
          </Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Áp dụng">
            <select className="field" value={form.duration} onChange={(e) => setForm({ ...form, duration: e.target.value })}>
              <option value="ONCE">1 kỳ</option>
              <option value="REPEATING">Lặp lại (N kỳ đầu)</option>
              <option value="FOREVER">Mọi kỳ</option>
            </select>
          </Field>
          {form.duration === "REPEATING" ? (
            <Field label="Số kỳ áp dụng">
              <input
                className="field"
                type="number"
                value={form.durationCount ?? ""}
                onChange={(e) => setForm({ ...form, durationCount: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="vd: 3"
              />
            </Field>
          ) : (
            <Field label="Giới hạn lượt (tùy chọn)">
              <input
                className="field"
                type="number"
                value={form.maxRedemptions ?? ""}
                onChange={(e) => setForm({ ...form, maxRedemptions: e.target.value ? Number(e.target.value) : undefined })}
                placeholder="vd: 100"
              />
            </Field>
          )}
        </div>
        <Field label="Hết hạn (tùy chọn)">
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
          Kích hoạt ngay
        </label>
      </Modal>
    </>
  );
}
