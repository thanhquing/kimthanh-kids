import { CreditCard } from "lucide-react";
import { useState } from "react";
import { useSearchParams } from "react-router-dom";
import {
  invoiceRemaining,
  useCreateGatewayPayment,
  useInvoice,
  useMyInvoices,
  useVietQr,
} from "@/api/tuition";
import { TopBar } from "@/components/mobile/MobileShell";
import { InfoLine } from "@/components/mobile/Primitives";
import { BottomSheet } from "@/components/ui/BottomSheet";
import { useToast } from "@/components/ui/Toast";
import { useT } from "@/i18n";
import { formatInvoiceDate, isDueStatus, tuitionStatusLabel } from "@/lib/tuitionDisplay";
import { formatVnd } from "@/lib/utils";

export function PaymentCheckoutPage() {
  const { t, lang } = useT();
  const [searchParams] = useSearchParams();
  const [bankOpen, setBankOpen] = useState(false);
  const { toast } = useToast();
  const invoiceId = searchParams.get("invoiceId") ?? undefined;
  const invoicesQuery = useMyInvoices();
  // Chỉ fallback về hóa đơn đầu khi URL KHÔNG chỉ định invoiceId. Có invoiceId mà lỗi/không
  // truy cập được → tuyệt đối không fallback (tránh hiển thị & cho thanh toán nhầm hóa đơn).
  const fallbackInvoice = invoiceId
    ? undefined
    : invoicesQuery.data?.find((invoice) => isDueStatus(invoice.status)) ?? invoicesQuery.data?.[0];
  const selectedId = invoiceId ?? fallbackInvoice?.id;
  const invoiceQuery = useInvoice(selectedId);
  const invoice = invoiceQuery.data ?? fallbackInvoice;
  const vietQrQuery = useVietQr(invoice && isDueStatus(invoice.status) ? invoice.id : undefined);
  const gatewayMutation = useCreateGatewayPayment();
  const remaining = invoice ? invoiceRemaining(invoice) : 0;

  async function onGateway() {
    if (!invoice) return;
    const payment = await gatewayMutation.mutateAsync(invoice.id);
    toast(t("tuition.gatewayCreated"));
    window.open(payment.redirectUrl, "_blank", "noopener,noreferrer");
  }

  return (
    <>
      <TopBar title={t("tuition.paymentTitle")} backTo="/parent/invoices" />
      {invoicesQuery.isLoading || invoiceQuery.isLoading ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("common.loading")}</div>
      ) : null}
      {invoicesQuery.isError || invoiceQuery.isError ? (
        <div className="card mt-3 p-4 text-sm text-red-600">{t("tuition.detailError")}</div>
      ) : null}
      {!invoice && !invoicesQuery.isLoading && !invoiceQuery.isLoading && !invoicesQuery.isError && !invoiceQuery.isError ? (
        <div className="card mt-3 p-4 text-sm text-slate-500">{t("tuition.listEmpty")}</div>
      ) : null}
      {invoice ? (
        <>
      <div className="card brand-grad mt-3 p-4 text-white">
        <div className="text-xs opacity-80">{t("tuition.remaining")}</div>
        <div className="mt-1 text-3xl font-bold">{formatVnd(Math.max(remaining, 0))}</div>
        <div className="mt-2 text-xs opacity-80">
          {invoice.invoiceNumber} · {tuitionStatusLabel(invoice.status, t)} · {formatInvoiceDate(invoice.dueDate, lang)}
        </div>
      </div>
      <div className="section-title">{t("tuition.detailSection")}</div>
      <div className="card divide-y divide-slate-100">
        <div className="flex items-center justify-between gap-3 p-3">
          <div>
            <div className="text-sm font-semibold">{invoice.student?.fullName ?? t("medicine.student")}</div>
            <div className="text-xs text-slate-500">{invoice.period}</div>
          </div>
          <div className="text-sm font-bold">{formatVnd(Number(invoice.total))}</div>
        </div>
        <div className="flex items-center justify-between gap-3 p-3">
          <div className="text-sm text-slate-500">{t("tuition.paid")}</div>
          <div className="text-sm font-bold">{formatVnd(Number(invoice.amountPaid))}</div>
        </div>
      </div>
      <div className="section-title">{t("tuition.paymentMethod")}</div>
      <button type="button" onClick={() => setBankOpen(true)} className="card flex w-full items-center gap-3 p-3 text-left" disabled={remaining <= 0}>
        <CreditCard className="h-5 w-5 text-[color:var(--primary)]" />
        <div className="flex-1">
          <div className="text-sm font-semibold">{t("tuition.bankTransfer")}</div>
          <div className="text-xs text-slate-500">{vietQrQuery.isError ? t("tuition.vietQrUnavailable") : t("tuition.vietQr")}</div>
        </div>
      </button>
      <button
        type="button"
        className="btn-primary mt-3 w-full disabled:opacity-60"
        disabled={remaining <= 0 || gatewayMutation.isPending}
        onClick={onGateway}
      >
        {gatewayMutation.isPending ? t("tuition.gatewayCreating") : t("tuition.payGateway")}
      </button>
      <BottomSheet open={bankOpen} title={t("tuition.bankInfo")} onClose={() => setBankOpen(false)}>
        <div className="space-y-2 text-sm">
          {vietQrQuery.isLoading ? <div className="text-slate-500">{t("common.loading")}</div> : null}
          {vietQrQuery.data ? (
            <>
          <InfoLine label={t("tuition.bank")} value={vietQrQuery.data.bankBin} />
          <InfoLine label={t("tuition.account")} value={vietQrQuery.data.accountNumber} />
          <InfoLine label={t("tuition.accountName")} value={vietQrQuery.data.accountName || t("reports.notUpdated")} />
          <InfoLine label={t("tuition.amount")} value={formatVnd(vietQrQuery.data.amount)} />
          <InfoLine label={t("tuition.transferContent")} value={vietQrQuery.data.addInfo} />
          <button
            type="button"
            className="btn-primary mt-3 w-full"
            onClick={() => {
              navigator.clipboard?.writeText(vietQrQuery.data.addInfo).catch(() => undefined);
              toast(t("tuition.copied"));
              setBankOpen(false);
            }}
          >
            {t("tuition.copyContent")}
          </button>
            </>
          ) : null}
          {vietQrQuery.isError ? <div className="text-sm text-red-600">{t("tuition.vietQrUnavailable")}</div> : null}
        </div>
      </BottomSheet>
        </>
      ) : null}
    </>
  );
}
