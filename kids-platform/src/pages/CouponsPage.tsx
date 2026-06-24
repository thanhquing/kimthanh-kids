import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Plus } from "lucide-react";
import { useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type CreateCouponInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { formatDate } from "@/lib/labels";
import { cn, formatVnd } from "@/lib/utils";

const KIND_LABEL: Record<string, string> = { PERCENT: "Phần trăm", FIXED_AMOUNT: "Số tiền" };
const DURATION_LABEL: Record<string, string> = {
  ONCE: "1 kỳ",
  REPEATING: "Lặp lại",
  FOREVER: "Vĩnh viễn",
};
const EMPTY: CreateCouponInput = { code: "", kind: "PERCENT", amount: 0, duration: "ONCE", isActive: true };

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
      <PageHeader title="Mã giảm giá">
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
                <tr><td colSpan={7} className="!text-center text-muted">Chưa có mã.</td></tr>
              )}
              {items.map((c) => (
                <tr key={c.id}>
                  <td className="font-semibold">{c.code}</td>
                  <td>{KIND_LABEL[c.kind] ?? c.kind}</td>
                  <td>{c.kind === "PERCENT" ? `${c.amount}%` : formatVnd(c.amount)}</td>
                  <td>{DURATION_LABEL[c.duration] ?? c.duration}</td>
                  <td>
                    {c.redemptions ?? 0}
                    {c.maxRedemptions ? ` / ${c.maxRedemptions}` : ""}
                  </td>
                  <td>{formatDate(c.validUntil)}</td>
                  <td>
                    <span className={cn("badge", c.isActive ? "b-green" : "b-slate")}>
                      {c.isActive ? "Hiệu lực" : "Tắt"}
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
          <input className="field" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Loại">
            <select className="field" value={form.kind} onChange={(e) => setForm({ ...form, kind: e.target.value })}>
              <option value="PERCENT">Phần trăm (%)</option>
              <option value="FIXED_AMOUNT">Số tiền (đ)</option>
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
              <option value="REPEATING">Lặp lại</option>
              <option value="FOREVER">Vĩnh viễn</option>
            </select>
          </Field>
          <Field label="Hết hạn (tùy chọn)">
            <input
              className="field"
              type="date"
              value={form.validUntil ?? ""}
              onChange={(e) => setForm({ ...form, validUntil: e.target.value || undefined })}
            />
          </Field>
        </div>
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
