import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, QrCode, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { ApiError } from "@/api/http";
import { platform, type UpdatePlatformSettingsInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";

// Ngân hàng phổ biến + mã BIN NAPAS (VietQR). img.vietqr.io nhận BIN trực tiếp.
const BANKS: { bin: string; name: string }[] = [
  { bin: "970436", name: "Vietcombank (VCB)" },
  { bin: "970407", name: "Techcombank (TCB)" },
  { bin: "970422", name: "MB Bank (MB)" },
  { bin: "970416", name: "ACB" },
  { bin: "970418", name: "BIDV" },
  { bin: "970415", name: "VietinBank" },
  { bin: "970405", name: "Agribank" },
  { bin: "970432", name: "VPBank" },
  { bin: "970403", name: "Sacombank (STB)" },
  { bin: "970423", name: "TPBank" },
  { bin: "970441", name: "VIB" },
  { bin: "970437", name: "HDBank" },
  { bin: "970448", name: "OCB" },
  { bin: "970443", name: "SHB" },
  { bin: "970426", name: "MSB" },
];

const DEMO_INVOICE = "PINV-2026-000001";

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

  // VietQR preview — chỉ khi đủ BIN + số TK (img.vietqr.io: BIN-STK-compact2.png).
  const qrUrl =
    form.bankBin && form.bankAccountNumber
      ? `https://img.vietqr.io/image/${form.bankBin}-${form.bankAccountNumber}-compact2.png` +
        `?amount=1200000&addInfo=${encodeURIComponent(DEMO_INVOICE)}` +
        (form.bankAccountName ? `&accountName=${encodeURIComponent(form.bankAccountName)}` : "")
      : null;

  return (
    <>
      <PageHeader title="Cài đặt" section="Cấu hình" />

      <main className="p-6 max-w-4xl space-y-6">
        {isLoading && <div className="text-muted">Đang tải…</div>}

        {/* Tài khoản nhận thanh toán */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Landmark className="w-4 h-4 text-[color:var(--primary)]" />
            Tài khoản nhận thanh toán (VietQR)
          </div>
          <p className="text-xs text-slate-400 mb-4">
            Trường chuyển khoản theo mã VietQR sinh sẵn — nội dung CK là <b>số hóa đơn</b> để bạn đối
            soát rồi bấm "Đánh dấu đã thu". Đối soát tự động (SePay) sẽ thêm sau.
          </p>
          <div className="grid md:grid-cols-2 gap-5">
            <div className="space-y-3">
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
            <div className="flex flex-col items-center justify-center rounded-xl bg-[#fff8f3] p-4">
              <div className="flex items-center gap-1.5 text-xs text-slate-500 mb-2">
                <QrCode className="w-3.5 h-3.5" /> Xem trước VietQR (HĐ {DEMO_INVOICE})
              </div>
              {qrUrl ? (
                <img src={qrUrl} alt="VietQR preview" className="w-44 h-44 rounded-lg bg-white" />
              ) : (
                <div className="w-44 h-44 rounded-lg border-2 border-dashed border-slate-200 grid place-items-center text-xs text-slate-400 text-center px-3">
                  Chọn ngân hàng + nhập số tài khoản để xem mã
                </div>
              )}
            </div>
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
