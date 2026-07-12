import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { crm, type TenantSettings, type UpdateSettings } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { Field } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { BANKS } from "@/lib/vietqr";

type FormKey =
  | "displayName"
  | "logoUrl"
  | "primaryColor"
  | "secondaryColor"
  | "supportEmail"
  | "taxCode"
  | "invoiceAddress"
  | "bankBin"
  | "bankAccountNumber"
  | "bankAccountName";

const KEYS: FormKey[] = [
  "displayName",
  "logoUrl",
  "primaryColor",
  "secondaryColor",
  "supportEmail",
  "taxCode",
  "invoiceAddress",
  "bankBin",
  "bankAccountNumber",
  "bankAccountName",
];

function toForm(s?: TenantSettings | null): Record<FormKey, string> {
  return {
    displayName: s?.displayName ?? "",
    logoUrl: s?.logoUrl ?? "",
    primaryColor: s?.primaryColor ?? "#f26b5e",
    secondaryColor: s?.secondaryColor ?? "",
    supportEmail: s?.supportEmail ?? "",
    taxCode: s?.taxCode ?? "",
    invoiceAddress: s?.invoiceAddress ?? "",
    bankBin: s?.bankBin ?? "",
    bankAccountNumber: s?.bankAccountNumber ?? "",
    bankAccountName: s?.bankAccountName ?? "",
  };
}

export function SettingsPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();

  const schools = useQuery({ queryKey: ["schools"], queryFn: () => crm.schools() });
  const settings = useQuery({ queryKey: ["crm-settings"], queryFn: () => crm.settings.get() });
  const [form, setForm] = useState<Record<FormKey, string>>(toForm(undefined));

  // Đồng bộ form khi settings tải xong (chỉ set lại khi data đổi).
  useEffect(() => {
    if (settings.data !== undefined) setForm(toForm(settings.data));
  }, [settings.data]);

  const school = schools.data?.[0];
  const set = (k: FormKey) => (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }));

  const save = useMutation({
    mutationFn: () => {
      // Zod `.optional()` từ chối "" (email/bankBin…) → chỉ gửi field có giá trị.
      const body: UpdateSettings = {};
      for (const k of KEYS) {
        const v = form[k].trim();
        if (v) (body as Record<string, string>)[k] = v;
      }
      return crm.settings.update(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-settings"] });
      toast(t("settings.saved"));
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  return (
    <>
      <PageHeader title={t("settings.title")} section={t("settings.section")} />
      <main className="p-6 max-w-3xl space-y-5">
        {/* Thông tin trường (read-only) */}
        <div className="card p-6">
          <div className="font-bold mb-1">{t("settings.schoolInfo")}</div>
          <div className="text-xs text-slate-400 mb-4">{t("settings.schoolInfoHint")}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t("settings.fSchoolName")}>
              <input className="field bg-slate-50" value={school?.name ?? ""} disabled />
            </Field>
            <Field label={t("settings.fCode")}>
              <input className="field bg-slate-50" value={school?.code ?? ""} disabled />
            </Field>
            <Field label={t("settings.fAddress")}>
              <input className="field bg-slate-50" value={school?.address ?? ""} disabled />
            </Field>
            <Field label={t("settings.fPhone")}>
              <input className="field bg-slate-50" value={school?.phone ?? ""} disabled />
            </Field>
          </div>
        </div>

        {/* Thương hiệu */}
        <div className="card p-6">
          <div className="font-bold mb-4">{t("settings.branding")}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t("settings.fDisplayName")}>
              <input className="field" value={form.displayName} onChange={set("displayName")} />
            </Field>
            <Field label={t("settings.fSupportEmail")}>
              <input className="field" type="email" value={form.supportEmail} onChange={set("supportEmail")} />
            </Field>
            <Field label={t("settings.fLogoUrl")}>
              <input className="field" value={form.logoUrl} onChange={set("logoUrl")} placeholder="https://…" />
            </Field>
            <div className="grid grid-cols-2 gap-3">
              <Field label={t("settings.fPrimaryColor")}>
                <input className="field !p-1 h-10" type="color" value={form.primaryColor || "#f26b5e"} onChange={set("primaryColor")} />
              </Field>
              <Field label={t("settings.fSecondaryColor")}>
                <input className="field !p-1 h-10" type="color" value={form.secondaryColor || "#f89a5b"} onChange={set("secondaryColor")} />
              </Field>
            </div>
          </div>
        </div>

        {/* Chứng từ & VietQR */}
        <div className="card p-6">
          <div className="font-bold mb-1">{t("settings.billing")}</div>
          <div className="text-xs text-slate-400 mb-4">{t("settings.billingHint")}</div>
          <div className="grid md:grid-cols-2 gap-4">
            <Field label={t("settings.fTaxCode")}>
              <input className="field" value={form.taxCode} onChange={set("taxCode")} />
            </Field>
            <Field label={t("settings.fInvoiceAddress")}>
              <input className="field" value={form.invoiceAddress} onChange={set("invoiceAddress")} />
            </Field>
            <Field label={t("settings.fBank")}>
              <select className="field" value={form.bankBin} onChange={set("bankBin")}>
                <option value="">{t("settings.bankSelect")}</option>
                {BANKS.map((b) => (
                  <option key={b.bin} value={b.bin}>
                    {b.name}
                  </option>
                ))}
              </select>
            </Field>
            <Field label={t("settings.fBankAccount")}>
              <input className="field" value={form.bankAccountNumber} onChange={set("bankAccountNumber")} />
            </Field>
            <Field label={t("settings.fBankAccountName")}>
              <input className="field" value={form.bankAccountName} onChange={set("bankAccountName")} />
            </Field>
          </div>
        </div>

        <button
          className="btn-primary"
          onClick={() => save.mutate()}
          disabled={save.isPending || !form.displayName.trim()}
        >
          {save.isPending ? t("common.saving") : t("settings.save")}
        </button>
      </main>
    </>
  );
}
