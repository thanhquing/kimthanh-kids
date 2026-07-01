import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Printer } from "lucide-react";
import { useState } from "react";
import { useParams } from "react-router-dom";
import { crm, type ManualPayment } from "@/api/crm";
import { ApiError } from "@/api/http";
import { PageHeader } from "@/components/PageHeader";
import { ConfirmDialog } from "@/components/ui/ConfirmDialog";
import { Field, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { useT, type TKey } from "@/i18n";
import { formatDate, formatDateTime } from "@/lib/labels";
import { formatVnd } from "@/lib/utils";
import { vietQrUrl } from "@/lib/vietqr";
import { INVOICE_STATUS_BADGE, INVOICE_STATUS_KEY, invoiceDisplay, openInvoicePrint } from "./TuitionPage";

const METHOD_KEY: Record<string, TKey> = {
  CASH: "payMethod.CASH",
  BANK_TRANSFER: "payMethod.BANK_TRANSFER",
  VNPAY: "payMethod.VNPAY",
};

function VietQrModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { t } = useT();
  const qr = useQuery({ queryKey: ["vietqr", id], queryFn: () => crm.tuition.vietqr(id), retry: false });
  const data = qr.data;
  const imgUrl = data
    ? vietQrUrl({
        bin: data.bankBin,
        account: data.accountNumber,
        accountName: data.accountName,
        amount: data.amount,
        addInfo: data.addInfo,
      })
    : null;

  return (
    <Modal open onClose={onClose} title={t("tuition.vietqr")}>
      {qr.isLoading ? (
        <div className="py-8 text-center text-sm text-muted">{t("common.loading")}</div>
      ) : qr.isError ? (
        <div className="py-6 text-center text-sm text-red-600">
          {qr.error instanceof ApiError && qr.error.code === "NO_BANK_CONFIG"
            ? t("tuition.vietqrNoBank")
            : qr.error instanceof ApiError && qr.error.code === "NOTHING_DUE"
              ? t("tuition.vietqrNothingDue")
              : qr.error instanceof ApiError
                ? qr.error.message
                : t("common.errorGeneric")}
        </div>
      ) : data ? (
        <div className="text-center">
          {imgUrl && <img src={imgUrl} alt="VietQR" className="mx-auto w-56 h-56 object-contain" />}
          <div className="text-xs text-slate-400 mt-2">{t("tuition.qrScanHint")}</div>
          <dl className="text-sm mt-3 space-y-1 text-left max-w-xs mx-auto">
            <Row label={t("tuition.qrAccount")} value={`${data.accountNumber}${data.accountName ? ` · ${data.accountName}` : ""}`} />
            <Row label={t("tuition.qrAmount")} value={formatVnd(data.amount)} />
            <Row label={t("tuition.qrContent")} value={data.addInfo} />
          </dl>
        </div>
      ) : null}
    </Modal>
  );
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between gap-3">
      <span className="text-slate-400">{label}</span>
      <span className="font-medium text-right">{value}</span>
    </div>
  );
}

function PayModal({ id, remaining, onClose }: { id: string; remaining: number; onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [method, setMethod] = useState<"CASH" | "BANK_TRANSFER">("CASH");
  const [amount, setAmount] = useState("");
  const [reference, setReference] = useState("");

  const pay = useMutation({
    mutationFn: () => {
      const body: ManualPayment = { method, amount: amount ? Number(amount) : undefined, reference: reference || undefined };
      return crm.tuition.payManual(id, body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tuition-invoice", id] });
      qc.invalidateQueries({ queryKey: ["tuition-invoices"] });
      qc.invalidateQueries({ queryKey: ["crm-dashboard"] });
      toast(t("tuition.paid"));
      onClose();
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <Modal
      open
      onClose={onClose}
      title={t("tuition.payTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={pay.isPending}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary text-sm" onClick={() => pay.mutate()} disabled={pay.isPending}>
            {pay.isPending ? t("common.saving") : t("common.save")}
          </button>
        </>
      }
    >
      <Field label={t("tuition.fMethod")}>
        <select className="field" value={method} onChange={(e) => setMethod(e.target.value as "CASH" | "BANK_TRANSFER")}>
          <option value="CASH">{t("payMethod.CASH")}</option>
          <option value="BANK_TRANSFER">{t("payMethod.BANK_TRANSFER")}</option>
        </select>
      </Field>
      <Field label={t("tuition.fAmount")}>
        <input className="field" type="number" min={0} value={amount} onChange={(e) => setAmount(e.target.value)} placeholder={String(remaining)} />
      </Field>
      <p className="text-xs text-slate-400 -mt-1">{t("tuition.amountHint")}</p>
      <Field label={t("tuition.fReference")}>
        <input className="field" value={reference} onChange={(e) => setReference(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function TuitionInvoiceDetailPage() {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const { id = "" } = useParams();
  const [qrOpen, setQrOpen] = useState(false);
  const [payOpen, setPayOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);

  const invoice = useQuery({
    queryKey: ["tuition-invoice", id],
    queryFn: () => crm.tuition.get(id),
    enabled: !!id,
  });
  const inv = invoice.data;
  const remaining = inv ? inv.total - inv.amountPaid : 0;
  const ds = inv ? invoiceDisplay(inv) : "UNPAID";
  const canPay = inv && inv.status !== "CANCELED" && remaining > 0;

  const cancel = useMutation({
    mutationFn: () => crm.tuition.cancel(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tuition-invoice", id] });
      qc.invalidateQueries({ queryKey: ["tuition-invoices"] });
      toast(t("tuition.canceled"));
      setCancelOpen(false);
    },
    onError: (e) => toast(e instanceof ApiError ? e.message : t("common.errorGeneric"), "error"),
  });

  return (
    <>
      <PageHeader
        title={inv?.invoiceNumber ?? t("tuition.detailTitle")}
        section={t("tuition.detailSection")}
      />
      <main className="p-6 max-w-4xl">
        {invoice.isLoading || !inv ? (
          <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
        ) : (
          <div className="grid lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 space-y-5">
              <div className="card p-6">
                <div className="flex items-start justify-between mb-4">
                  <div>
                    <div className="text-xl font-bold">{inv.invoiceNumber}</div>
                    <div className="text-sm text-slate-500">
                      {inv.student.fullName} · {inv.period}
                    </div>
                    <div className="text-xs text-slate-400 mt-1">
                      {formatDate(inv.issueDate)} → {formatDate(inv.dueDate)}
                    </div>
                  </div>
                  <span className={`badge ${INVOICE_STATUS_BADGE[ds]}`}>{t(INVOICE_STATUS_KEY[ds])}</span>
                </div>

                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-slate-400 uppercase">
                      <th className="text-left font-semibold py-2">{t("tuition.colItem")}</th>
                      <th className="text-center font-semibold py-2 w-12">{t("tuition.colQty")}</th>
                      <th className="text-right font-semibold py-2 w-28">{t("tuition.colUnit")}</th>
                      <th className="text-right font-semibold py-2 w-28">{t("tuition.colLineAmount")}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(inv.items ?? []).map((it) => (
                      <tr key={it.id} className="border-t border-slate-100">
                        <td className="py-2">{it.label}</td>
                        <td className="py-2 text-center">{it.quantity}</td>
                        <td className="py-2 text-right">{formatVnd(it.unitPrice)}</td>
                        <td className="py-2 text-right">{formatVnd(it.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>

                <div className="border-t border-slate-100 mt-3 pt-3 space-y-1.5 text-sm max-w-xs ml-auto">
                  <Row label={t("tuition.subtotal")} value={formatVnd(inv.subtotal)} />
                  {inv.discount > 0 && <Row label={t("tuition.discount")} value={`- ${formatVnd(inv.discount)}`} />}
                  <div className="flex justify-between gap-3 font-bold text-base">
                    <span>{t("tuition.total")}</span>
                    <span>{formatVnd(inv.total)}</span>
                  </div>
                  <Row label={t("tuition.amountPaid")} value={formatVnd(inv.amountPaid)} />
                  <div className="flex justify-between gap-3 font-semibold text-amber-600">
                    <span>{t("tuition.remaining")}</span>
                    <span>{formatVnd(remaining)}</span>
                  </div>
                </div>
                {inv.note && <div className="text-xs text-slate-500 mt-3">{inv.note}</div>}
              </div>

              <div className="card p-5">
                <div className="font-bold mb-3">{t("tuition.paymentHistory")}</div>
                {(inv.payments ?? []).filter((p) => p.status === "SUCCEEDED").length === 0 ? (
                  <div className="text-sm text-muted py-4 text-center">{t("tuition.paymentsEmpty")}</div>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {(inv.payments ?? [])
                      .filter((p) => p.status === "SUCCEEDED")
                      .map((p) => (
                        <div key={p.id} className="py-2.5 flex items-center justify-between text-sm">
                          <div>
                            <div className="font-medium">{t(METHOD_KEY[p.method] ?? "payMethod.CASH")}</div>
                            <div className="text-xs text-slate-400">
                              {formatDateTime(p.paidAt ?? p.createdAt)}
                              {p.reference ? ` · ${p.reference}` : ""}
                            </div>
                          </div>
                          <div className="font-semibold text-emerald-600">{formatVnd(p.amount)}</div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            </div>

            {/* Hành động */}
            <div className="space-y-3">
              <button className="btn-primary w-full" onClick={() => setQrOpen(true)} disabled={!canPay}>
                {t("tuition.vietqr")}
              </button>
              <button className="btn-soft w-full" onClick={() => setPayOpen(true)} disabled={!canPay}>
                {t("tuition.payCash")}
              </button>
              <button
                className="btn-soft w-full inline-flex items-center justify-center gap-2"
                onClick={() => openInvoicePrint(inv.id, (m) => toast(m, "error"), t)}
              >
                <Printer className="w-4 h-4" />
                {t("tuition.print")}
              </button>
              {inv.status !== "CANCELED" && (
                <button className="btn-soft w-full !text-red-600" onClick={() => setCancelOpen(true)}>
                  {t("tuition.cancel")}
                </button>
              )}
            </div>
          </div>
        )}
      </main>

      {qrOpen && <VietQrModal id={id} onClose={() => setQrOpen(false)} />}
      {payOpen && <PayModal id={id} remaining={remaining} onClose={() => setPayOpen(false)} />}
      <ConfirmDialog
        open={cancelOpen}
        title={t("tuition.cancel")}
        message={t("tuition.cancelConfirm")}
        confirmLabel={t("tuition.cancel")}
        danger
        busy={cancel.isPending}
        onConfirm={() => cancel.mutate()}
        onClose={() => setCancelOpen(false)}
      />
    </>
  );
}
