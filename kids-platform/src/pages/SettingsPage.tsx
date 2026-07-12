import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Landmark, ShieldAlert } from "lucide-react";
import { useEffect, useState } from "react";
import { errorMessage } from "@/lib/errorMessage";
import { platform, type UpdatePlatformSettingsInput } from "@/api/platform";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { BANKS } from "@/lib/vietqr";

export function SettingsPage() {
  const qc = useQueryClient();
  const { t } = useT();
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
  const onErr = (e: unknown) => toast(errorMessage(e, t), "error");
  const onOk = (label: string) => {
    toast(t("set.savedPrefix", { label }));
    qc.invalidateQueries({ queryKey: ["settings"] });
  };

  const saveBank = useMutation({
    mutationFn: () =>
      platform.updateSettings({
        bankBin: form.bankBin,
        bankAccountNumber: form.bankAccountNumber,
        bankAccountName: form.bankAccountName,
      }),
    onSuccess: () => onOk(t("set.labelBank")),
    onError: onErr,
  });
  const saveDunning = useMutation({
    mutationFn: () =>
      platform.updateSettings({
        pastDueGraceDays: form.pastDueGraceDays,
        suspendedGraceDays: form.suspendedGraceDays,
      }),
    onSuccess: () => onOk(t("set.labelDunning")),
    onError: onErr,
  });

  const set = (patch: UpdatePlatformSettingsInput) => setForm((f) => ({ ...f, ...patch }));

  return (
    <>
      <PageHeader title={t("nav.settings")} section={t("navGroups.config")} />

      <main className="p-6 max-w-4xl space-y-6">
        {isLoading && <div className="text-muted">{t("common.loading")}</div>}

        {/* Tài khoản nhận thanh toán */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold mb-1">
            <Landmark className="w-4 h-4 text-[color:var(--primary)]" />
            {t("set.bankTitle")}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            {t("set.bankHintPre")}<b>{t("set.bankHintBold")}</b>{t("set.bankHintPost")}
          </p>
          <div className="grid md:grid-cols-3 gap-4">
            <Field label={t("set.fBank")}>
              <select
                className="field"
                value={form.bankBin ?? ""}
                onChange={(e) => set({ bankBin: e.target.value })}
              >
                <option value="">{t("set.bankSelect")}</option>
                {BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("set.fAccountNumber")}>
              <input
                className="field"
                value={form.bankAccountNumber ?? ""}
                onChange={(e) => set({ bankAccountNumber: e.target.value.replace(/\D/g, "") })}
                placeholder={t("set.fAccountNumberPh")}
              />
            </Field>
            <Field label={t("set.fAccountName")}>
              <input
                className="field"
                value={form.bankAccountName ?? ""}
                onChange={(e) => set({ bankAccountName: e.target.value.toUpperCase() })}
                placeholder={t("set.fAccountNamePh")}
              />
            </Field>
          </div>
          <div className="flex justify-end mt-4 pt-4 border-t border-slate-100">
            <button
              className="btn-primary text-sm"
              disabled={saveBank.isPending || isLoading}
              onClick={() => saveBank.mutate()}
            >
              {saveBank.isPending ? t("common.saving") : t("set.saveBank")}
            </button>
          </div>
        </div>

        {/* Quy tắc nhắc nợ */}
        <div className="card p-5">
          <div className="flex items-center gap-2 font-bold mb-1">
            <ShieldAlert className="w-4 h-4 text-[color:var(--primary)]" />
            {t("set.dunningTitle")}
          </div>
          <p className="text-xs text-slate-400 mb-4">
            {t("set.dunningHintPre")}<b>{t("set.dunningHintBold1")}</b>{t("set.dunningHintMid")}
            <b>{t("set.dunningHintBold2")}</b>{t("set.dunningHintPost")}
          </p>
          <div className="grid md:grid-cols-2 gap-5 max-w-xl">
            <Field label={t("set.fPastDue")}>
              <input
                className="field"
                type="number"
                min={0}
                value={form.pastDueGraceDays ?? ""}
                onChange={(e) => set({ pastDueGraceDays: Number(e.target.value) })}
              />
            </Field>
            <Field label={t("set.fSuspended")}>
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
              {saveDunning.isPending ? t("common.saving") : t("set.saveDunning")}
            </button>
          </div>
        </div>
      </main>
    </>
  );
}
