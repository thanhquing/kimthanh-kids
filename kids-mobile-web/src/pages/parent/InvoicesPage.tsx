import { Calendar } from "lucide-react";
import { useState } from "react";
import { NavLink } from "react-router-dom";
import { invoiceRemaining, useMyInvoices } from "@/api/tuition";
import { TopBar } from "@/components/mobile/MobileShell";
import { StatusBadge } from "@/components/mobile/Primitives";
import { useT } from "@/i18n";
import { formatInvoiceDate, isDueStatus, tuitionFilters, tuitionStatusLabel } from "@/lib/tuitionDisplay";
import { formatVnd } from "@/lib/utils";
import type { TuitionInvoiceStatus } from "@/api/tuition";

export function InvoicesPage() {
  const { t, lang } = useT();
  const [filter, setFilter] = useState<TuitionInvoiceStatus | "DUE" | "ALL">("DUE");
  const { data: invoices = [], isLoading, isError } = useMyInvoices();
  const visibleInvoices = invoices.filter((invoice) => {
    if (filter === "ALL") return true;
    if (filter === "DUE") return isDueStatus(invoice.status);
    return invoice.status === filter;
  });
  const dueCount = invoices.filter((invoice) => isDueStatus(invoice.status)).length;

  return (
    <>
      <TopBar title={t("tuition.title")} backTo="/parent" />
      <div className="mb-3 mt-3 flex gap-2 overflow-x-auto">
        {tuitionFilters.map((item) => (
          <button
            key={item}
            type="button"
            onClick={() => setFilter(item)}
            className={`chip whitespace-nowrap ${filter === item ? "active" : ""}`}
          >
            {item === "DUE" ? t("tuition.filterDueWithCount", { count: dueCount }) : tuitionStatusLabel(item, t)}
          </button>
        ))}
      </div>
      {isLoading ? <div className="card p-4 text-sm text-slate-500">{t("common.loading")}</div> : null}
      {isError ? <div className="card p-4 text-sm text-red-600">{t("tuition.listError")}</div> : null}
      {!isLoading && !isError && visibleInvoices.length === 0 ? (
        <div className="card p-4 text-sm text-slate-500">{t("tuition.listEmpty")}</div>
      ) : null}
      <div className="space-y-3">
        {visibleInvoices.map((invoice) => {
          const remaining = invoiceRemaining(invoice);
          return (
          <div key={invoice.id} className="card p-4">
            <div className="mb-1 flex items-center justify-between gap-2">
              <div className="font-semibold">{invoice.period}</div>
              <StatusBadge status={tuitionStatusLabel(invoice.status, t)} />
            </div>
            <div className="text-xs text-slate-500">{invoice.student?.fullName ?? t("medicine.student")} · {invoice.invoiceNumber}</div>
            <div className="mt-2 text-2xl font-bold text-slate-800">{formatVnd(remaining > 0 ? remaining : Number(invoice.total))}</div>
            <div className="mt-1 text-xs text-slate-500">
              <Calendar className="inline h-3 w-3" /> {t("tuition.dueDate", { date: formatInvoiceDate(invoice.dueDate, lang) })}
            </div>
            <NavLink to={`/parent/payment?invoiceId=${invoice.id}`} className="btn-soft mt-3 block w-full text-center text-sm">
              {invoice.status === "PAID" ? t("tuition.viewReceipt") : t("tuition.pay")}
            </NavLink>
          </div>
          );
        })}
      </div>
    </>
  );
}
