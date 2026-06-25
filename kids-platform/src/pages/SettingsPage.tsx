import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type UpdatePlatformSettingsInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { BANKS } from "@/lib/vietqr";

export function SettingsPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data, isLoading } = useQuery({ queryKey: ["settings"], queryFn: () => platform.getSettings() });

  const [form, setForm] = useState<UpdatePlatformSettingsInput>({});
  useEffect(() => {
    if (data) {
      setForm({
        bankBin: data.bankBin ?? "",
        bankAccountNumber: data.bankAccountNumber ?? "",
        bankAccountName: data.bankAccountName ?? "",
        pastDueGraceDays: data.pastDueGraceDays,
        suspendedGraceDays: data.suspendedGraceDays,
      });
    }
  }, [data]);

  // Mỗi section lưu độc lập — gửi đúng phần dữ liệu của mình (PATCH nhận partial).
  const onErr = (e: unknown) => toast(e instanceof ApiError ? e.message : "Lưu thất bại", "error");
  const onOk = (label: string) => {
    toast(`Đã lưu ${label}`);
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  const saveBank = useMutation({
    mutationFn: () =>
      platform.updateSettings({
        bankBin: form.bankBin,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
      }),
    onSuccess: () => onOk("tài khoản ngân hàng"),
    onError: onErr,
  });
  const saveDunning = useMutation({
    mutationFn: () =>
      platform.updateSettings({
        pastDueGraceDays: form.pastDueGraceDays,
        suspendedGraceDays: form.suspendedGraceDays,
      }),
    onSuccess: () => onOk("quy tắc nhắc nợ"),
    onError: onErr,
  });

  const set = (patch: UpdatePlatformSettingsInput) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader title="Cài đặt" section="Cấu hình" />

      <main className="p-6 max-w-4xl space-y-6">
        {isLoading && <div className="text-muted">Đang tải…</div>}

        {/* Tài khoản nhận thanh toán */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Landmark className="w-4 h-4 text-[color:var(--primary)]" />
            Tài khoản nhận thanh toán
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Dùng để sinh <b>mã VietQR trên từng hóa đơn</b> (nội dung CK = số hóa đơn) cho trường
            thanh toán. Mã QR được tạo ở trang chi tiết hóa đơn, không phải ở đây.
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label="Ngân hàng">
              <select
                className="field"
                value={form.bankBin ?? ""}
                onChange={(e) => set({ bankBin: e.target.value })}
              >
                <option value="">— Chọn ngân hàng —</option>
                {BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label="Số tài khoản">
              <input
                className="field"
                value={form.bankAccountNumber ?? ""}
                onChange={(e) => set({ bankAccountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder="vd: 0123456789"
              />
            </Field>
            <Field label="Tên chủ tài khoản">
              <input
                className="field"
                value={form.bankAccountName ?? ""}
                onChange={(e) => set({ bankAccountName: e.target.value.toUpperCase() })}
                placeholder="CONG TY KIMTHANH KIDS"
              />
            </Field>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <button
              className="btn-primary text-sm"
              disabled={saveBank.isPending || isLoading}
              onClick={() => saveBank.mutate()}
            >
              {saveBank.isPending ? "Đang lưu…" : "Lưu tài khoản"}
            </button>
          </div>
        </div>

        {/* Quy tắc nhắc nợ */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-[color:var(--primary)]" />
            Quy tắc nhắc nợ (dunning)
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Hệ thống tự chạy theo lịch: hóa đơn quá hạn → <b>tạm khóa</b> trường sau N ngày → <b>hủy</b>{" "}
            thuê bao sau M ngày kể từ lúc tạm khóa.
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-xl">
            <Field label="Quá hạn → tạm khóa sau (ngày)">
              <input
                className="field"
                type="number"
                min={0}
                value={form.pastDueGraceDays ?? ""}
                onChange={(e) => set({ pastDueGraceDays: Number(e.target.value) })}
              />
            </Field>
            <Field label="Tạm khóa → hủy sau (ngày)">
              <input
                className="field"
                type="number"
                min={0}
                value={form.suspendedGraceDays ?? ""}
                onChange={(e) => set({ suspendedGraceDays: Number(e.target.value) })}
              />
            </Field>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <button
              className="btn-primary text-sm"
              disabled={saveDunning.isPending || isLoading}
              onClick={() => saveDunning.mutate()}
            >
              {saveDunning.isPending ? "Đang lưu…" : "Lưu quy tắc"}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
