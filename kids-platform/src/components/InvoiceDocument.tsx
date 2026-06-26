import type { InvoiceDoc } from "@/api/platform";
import { useT, type TKey } from "@/i18n";
import { badgeFor, formatDate, INVOICE_STATUS, invoiceDisplayStatus } from "@/lib/labels";
import { readVnd } from "@/lib/numToWords";
import { cn, formatVnd } from "@/lib/utils";
import { bankName, vietQrUrl } from "@/lib/vietqr";

const CYCLE_KEY: Record<string, TKey> = {
  MONTHLY: "invdoc.cycle.MONTHLY",
  QUARTERLY: "invdoc.cycle.QUARTERLY",
  ANNUAL: "invdoc.cycle.ANNUAL",
};

/** Tờ hóa đơn nền tảng dạng in (A4) — dùng cho trang chi tiết admin & link công khai. */
export function InvoiceDocument({ doc }: { doc: InvoiceDoc }) {
  const { t } = useT();
  const st = badgeFor(INVOICE_STATUS, invoiceDisplayStatus(doc.status, doc.dueAt));
  const paid = doc.status === "PAID";
  const qr = paid
    ? null
    : vietQrUrl({
        bin: doc.bank.bin,
        account: doc.bank.accountNumber,
        accountName: doc.bank.accountName,
        amount: doc.amountDue,
        addInfo: doc.invoiceNumber,
      });

  return (
    <div className="print-area mx-auto max-w-[820px] bg-white rounded-2xl border border-slate-200 p-8 md:p-10">
      {/* Header: bên bán | số hóa đơn */}
      <div className="flex items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-14 h-14 rounded-2xl brand-grad grid place-items-center text-white font-bold text-2xl">
            K
          </div>
          <div>
            <div className="text-xl font-bold uppercase tracking-tight">{doc.seller.name}</div>
            <div className="text-xs text-slate-500">{doc.seller.note}</div>
            {doc.bank.accountName && (
              <div className="text-xs text-slate-500">{doc.bank.accountName}</div>
            )}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-slate-400">{t("invdoc.invoiceNo")}</div>
          <div className="font-mono font-bold text-slate-800">{doc.invoiceNumber}</div>
          <div className="text-xs text-slate-400 mt-1">
            {t("invdoc.date")}: <b className="text-slate-700">{formatDate(doc.issuedAt)}</b>
          </div>
          <span className={cn("badge mt-1", st.badge)}>{st.label}</span>
        </div>
      </div>

      <div className="border-t border-slate-200 my-5" />

      <div className="text-center">
        <div className="text-2xl font-bold tracking-tight">{t("invdoc.docTitle")}</div>
        <div className="text-sm text-slate-500">
          {t("invdoc.subscription")}
          {doc.planName ? t("dash.planSuffix", { name: doc.planName }) : ""}
          {doc.billingCycle
            ? t("invdoc.cycleSuffix", {
                cycle: CYCLE_KEY[doc.billingCycle] ? t(CYCLE_KEY[doc.billingCycle]) : doc.billingCycle,
              })
            : ""}
        </div>
      </div>

      {/* Bên mua */}
      <div className="mt-5 text-sm space-y-0.5">
        <div>
          {t("invdoc.customer")}: <b>{doc.buyer.name}</b>
          {doc.buyer.slug ? <span className="text-slate-400"> · {doc.buyer.slug}</span> : null}
        </div>
        {doc.buyer.taxCode && (
          <div>
            {t("invdoc.taxLabel")}: <b>{doc.buyer.taxCode}</b>
          </div>
        )}
        {doc.buyer.address && <div>{t("invdoc.address")}: {doc.buyer.address}</div>}
        <div className="text-slate-500">
          {t("invdoc.period")}: {formatDate(doc.periodStart)} – {formatDate(doc.periodEnd)}
        </div>
      </div>

      {/* Bảng dòng */}
      <table className="w-full mt-4 text-sm border-collapse">
        <thead>
          <tr className="bg-[#fff8f3] text-left">
            <th className="border border-slate-200 px-3 py-2 w-10">#</th>
            <th className="border border-slate-200 px-3 py-2">{t("invdoc.colDesc")}</th>
            <th className="border border-slate-200 px-3 py-2 text-right">{t("invdoc.colUnitPrice")}</th>
            <th className="border border-slate-200 px-3 py-2 text-center w-14">{t("invdoc.colQty")}</th>
            <th className="border border-slate-200 px-3 py-2 text-right">{t("invdoc.colAmount")}</th>
          </tr>
        </thead>
        <tbody>
          {doc.lines.map((l, i) => (
            <tr key={i}>
              <td className="border border-slate-200 px-3 py-2">{i + 1}</td>
              <td className="border border-slate-200 px-3 py-2">{l.label}</td>
              <td className="border border-slate-200 px-3 py-2 text-right">{formatVnd(l.unitPrice)}</td>
              <td className="border border-slate-200 px-3 py-2 text-center">{l.quantity}</td>
              <td className="border border-slate-200 px-3 py-2 text-right font-semibold">{formatVnd(l.amount)}</td>
            </tr>
          ))}
          <tr>
            <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right text-slate-500">{t("invdoc.subtotal")}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{formatVnd(doc.subtotal)}</td>
          </tr>
          {doc.discount > 0 && (
            <tr>
              <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right text-slate-500">{t("invdoc.discount")}</td>
              <td className="border border-slate-200 px-3 py-2 text-right">-{formatVnd(doc.discount)}</td>
            </tr>
          )}
          <tr>
            <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right text-slate-500">{t("invdoc.vat")}</td>
            <td className="border border-slate-200 px-3 py-2 text-right">{formatVnd(doc.tax)}</td>
          </tr>
          <tr className="bg-[#fff8f3]">
            <td colSpan={4} className="border border-slate-200 px-3 py-2 text-right font-bold">{t("invdoc.total")} ({doc.currency})</td>
            <td className="border border-slate-200 px-3 py-2 text-right font-bold text-lg">{formatVnd(doc.total)}</td>
          </tr>
        </tbody>
      </table>

      <div className="mt-3 text-sm">
        {t("invdoc.inWords")}: <i>{readVnd(doc.total)}</i>
      </div>
      {doc.amountPaid > 0 && doc.amountPaid < doc.total && (
        <div className="text-sm text-slate-500">
          {t("invdoc.partialPre", { paid: formatVnd(doc.amountPaid) })}
          <b>{formatVnd(doc.amountDue)}</b>
        </div>
      )}

      {/* QR thanh toán / trạng thái */}
      <div className="mt-5 rounded-xl border border-dashed border-slate-300 p-4 flex items-center gap-4">
        {paid ? (
          <div className="flex-1 text-center text-emerald-600 font-semibold py-4">
            {t("invdoc.paidNotice")}
            {doc.paidAt ? t("invdoc.paidOn", { date: formatDate(doc.paidAt) }) : ""}
          </div>
        ) : qr ? (
          <>
            <img src={qr} alt="VietQR" className="w-36 h-36 rounded-lg bg-white shrink-0" />
            <div className="text-sm">
              <div className="font-bold">{t("invdoc.qrTitle")}</div>
              <div className="text-slate-500 mt-1">
                {bankName(doc.bank.bin)} · {t("invdoc.qrAccount")} <b>{doc.bank.accountNumber}</b>
              </div>
              <div className="text-slate-500">
                {t("invdoc.qrOwner")}: <b>{doc.bank.accountName}</b>
              </div>
              <div className="text-slate-500">
                {t("invdoc.qrAmount")}: <b>{formatVnd(doc.amountDue)}</b>
              </div>
              <div className="text-slate-500">
                {t("invdoc.qrMemo")}: <b className="font-mono">{doc.invoiceNumber}</b>
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 text-sm text-slate-500 py-3">
            {t("invdoc.noBankPre")}<b>{t("nav.settings")}</b>{t("invdoc.noBankPost")}
          </div>
        )}
      </div>

      <div className="mt-8 text-center text-xs text-slate-400 border-t border-slate-100 pt-4">
        <b className="text-slate-500">KIMTHANHKIDS.VN</b>{t("invdoc.footerText")}
      </div>
    </div>
  );
}
