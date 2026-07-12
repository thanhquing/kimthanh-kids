import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { me } from "@/api/auth";
import { crm, type CreateInvoice, type Invoice, type TuitionInvoiceStatus } from "@/api/crm";
import { errorMessage } from "@/lib/errorMessage";
import { PageHeader } from "@/components/PageHeader";
import { EntitySelect } from "@/components/ui/EntitySelect";
import { Field, Modal } from "@/components/ui/Modal";
import { Pagination } from "@/components/ui/Pagination";
import { useToast } from "@/components/ui/Toast";
import { useDebounced } from "@/hooks/useDebounced";
import { usePaged } from "@/hooks/usePaged";
import { useT, type TKey, type Translator } from "@/i18n";
import { fetchAllPages } from "@/lib/fetchAll";
import { formatDate } from "@/lib/labels";
import { hasAnyRole } from "@/lib/roles";
import { cn, formatVnd } from "@/lib/utils";

const STATUS_KEY: Record<string, TKey> = {
  UNPAID: "invoiceStatus.UNPAID",
  PARTIAL: "invoiceStatus.PARTIAL",
  PAID: "invoiceStatus.PAID",
  OVERDUE: "invoiceStatus.OVERDUE",
  CANCELED: "invoiceStatus.CANCELED",
};
const STATUS_BADGE: Record<string, string> = {
  UNPAID: "b-amber",
  PARTIAL: "b-blue",
  PAID: "b-green",
  OVERDUE: "b-red",
  CANCELED: "b-slate",
};
const FILTERS: TuitionInvoiceStatus[] = ["UNPAID", "PARTIAL", "PAID", "OVERDUE", "CANCELED"];
const TUITION_MANAGERS = ["SCHOOL_ADMIN", "PRINCIPAL", "FINANCE"] as const;
const todayIso = () => new Date().toISOString().slice(0, 10);

/** Trạng thái HIỂN THỊ: HĐ chưa trả mà quá hạn → OVERDUE (dù DB còn UNPAID/PARTIAL). */
export function invoiceDisplay(inv: Invoice): string {
  if ((inv.status === "UNPAID" || inv.status === "PARTIAL") && new Date(inv.dueDate).getTime() < Date.now())
    return "OVERDUE";
  return inv.status;
}

/** Mở bản in HTML (fetch kèm auth rồi ghi sang cửa sổ mới + in). */
export async function openInvoicePrint(id: string, onError: (m: string) => void, t: Translator) {
  try {
    const html = await crm.tuition.printHtml(id);
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    setTimeout(() => w.print(), 400);
  } catch (e) {
    onError(errorMessage(e, t));
  }
}

type Line = { label: string; quantity: string; unitPrice: string };
const EMPTY_LINE: Line = { label: "", quantity: "1", unitPrice: "" };

function CreateInvoiceModal({ onClose }: { onClose: () => void }) {
  const { t } = useT();
  const { toast } = useToast();
  const qc = useQueryClient();
  const [studentId, setStudentId] = useState("");
  const [period, setPeriod] = useState("");
  const [issueDate, setIssueDate] = useState(todayIso());
  const [dueDate, setDueDate] = useState("");
  const [discount, setDiscount] = useState("");
  const [note, setNote] = useState("");
  const [lines, setLines] = useState<Line[]>([{ ...EMPTY_LINE }]);

  const subtotal = lines.reduce(
    (sum, l) => sum + (Number(l.quantity) || 0) * (Number(l.unitPrice) || 0),
    0,
  );
  const total = Math.max(0, subtotal - (Number(discount) || 0));

  const create = useMutation({
    mutationFn: () => {
      const body: CreateInvoice = {
        studentId,
        period,
        issueDate: issueDate || undefined,
        dueDate,
        discount: discount ? Number(discount) : undefined,
        note: note || undefined,
        items: lines
          .filter((l) => l.label.trim() && l.unitPrice)
          .map((l) => ({
            label: l.label.trim(),
            quantity: l.quantity ? Number(l.quantity) : undefined,
            unitPrice: Number(l.unitPrice),
          })),
      };
      return crm.tuition.create(body);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["tuition-invoices"] });
      toast(t("tuition.created"));
      onClose();
    },
    onError: (e) => toast(errorMessage(e, t), "error"),
  });

  const validItems = lines.filter((l) => l.label.trim() && l.unitPrice).length > 0;
  const valid = studentId && period.trim() && /^\d{4}-\d{2}-\d{2}$/.test(dueDate) && validItems;

  return (
    <Modal
      open
      onClose={onClose}
      title={t("tuition.formTitle")}
      footer={
        <>
          <button className="btn-soft text-sm" onClick={onClose} disabled={create.isPending}>
            {t("common.cancel")}
          </button>
          <button className="btn-primary text-sm" onClick={() => create.mutate()} disabled={create.isPending || !valid}>
            {create.isPending ? t("common.saving") : t("common.create")}
          </button>
        </>
      }
    >
      <Field label={t("tuition.fStudent")}>
        <EntitySelect
          value={studentId}
          fetchPage={(s) => crm.students.page({ search: s, pageSize: 20 })}
          labelOf={(st) => st.fullName}
          onChange={(id) => setStudentId(id)}
          queryKey={["students-select"]}
        />
      </Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label={t("tuition.fPeriod")}>
          <input className="field" value={period} onChange={(e) => setPeriod(e.target.value)} placeholder={t("tuition.fPeriodHint")} />
        </Field>
        <Field label={t("tuition.fIssueDate")}>
          <input className="field" type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
        </Field>
        <Field label={t("tuition.fDueDate")}>
          <input className="field" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
        </Field>
      </div>

      <div className="label">{t("tuition.items")}</div>
      <div className="space-y-2">
        {lines.map((l, i) => (
          <div key={i} className="flex gap-2 items-center">
            <input
              className="field !py-1.5 flex-1"
              placeholder={t("tuition.fItemLabel")}
              value={l.label}
              onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, label: e.target.value } : x)))}
            />
            <input
              className="field !py-1.5 w-14"
              type="number"
              min={1}
              value={l.quantity}
              onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, quantity: e.target.value } : x)))}
            />
            <input
              className="field !py-1.5 w-28"
              type="number"
              min={0}
              placeholder={t("tuition.fItemPrice")}
              value={l.unitPrice}
              onChange={(e) => setLines((ls) => ls.map((x, j) => (j === i ? { ...x, unitPrice: e.target.value } : x)))}
            />
            {lines.length > 1 && (
              <button className="text-slate-300 hover:text-red-500 px-1" onClick={() => setLines((ls) => ls.filter((_, j) => j !== i))}>
                ✕
              </button>
            )}
          </div>
        ))}
      </div>
      <button className="text-[color:var(--primary)] text-sm font-semibold" onClick={() => setLines((ls) => [...ls, { ...EMPTY_LINE }])}>
        {t("tuition.addItem")}
      </button>

      <div className="grid grid-cols-2 gap-3">
        <Field label={t("tuition.fDiscount")}>
          <input className="field" type="number" min={0} value={discount} onChange={(e) => setDiscount(e.target.value)} />
        </Field>
        <div className="flex flex-col justify-end pb-2 text-right">
          <div className="text-xs text-slate-400">{t("tuition.total")}</div>
          <div className="text-lg font-bold">{formatVnd(total)}</div>
        </div>
      </div>
      <Field label={t("tuition.fNote")}>
        <input className="field" value={note} onChange={(e) => setNote(e.target.value)} />
      </Field>
    </Modal>
  );
}

export function TuitionPage() {
  const { t } = useT();
  const { toast } = useToast();
  const meQuery = useQuery({ queryKey: ["auth", "me"], queryFn: me, staleTime: 5 * 60_000 });
  const canManageTuition = hasAnyRole(meQuery.data?.roles ?? [], [...TUITION_MANAGERS]);
  const [tab, setTab] = useState<"invoices" | "payments">("invoices");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);

  // KPI + tab Thanh toán cần TỔNG HỢP toàn bộ hóa đơn (mọi trang), nên tải đủ qua fetchAllPages.
  const allInvoices = useQuery({
    queryKey: ["tuition-invoices", "all"],
    queryFn: () => fetchAllPages((pg) => crm.tuition.page(pg)),
  });
  const all = useMemo(() => allInvoices.data ?? [], [allInvoices.data]);

  // Danh sách hóa đơn hiển thị: phân trang server-side theo status + search.
  const status = statusFilter ? (statusFilter as TuitionInvoiceStatus) : undefined;
  const debouncedSearch = useDebounced(search, 300);
  const listFilters = { status, search: debouncedSearch.trim() || undefined };
  const invoices = usePaged(
    ["tuition-invoices", listFilters],
    (pg) => crm.tuition.page({ ...listFilters, ...pg }),
  );

  const kpi = useMemo(() => {
    let total = 0, paid = 0, outstanding = 0, overdue = 0;
    for (const inv of all) {
      if (inv.status === "CANCELED") continue;
      const remaining = inv.total - inv.amountPaid;
      total += inv.total;
      paid += inv.amountPaid;
      outstanding += remaining;
      if (invoiceDisplay(inv) === "OVERDUE") overdue += remaining;
    }
    return { total, paid, outstanding, overdue };
  }, [all]);

  const collected = useMemo(() => all.filter((inv) => inv.amountPaid > 0 && inv.status !== "CANCELED"), [all]);

  return (
    <>
      <PageHeader title={t("tuition.title")} section={t("tuition.section")} />
      <main className="p-6">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
          <Kpi label={t("tuition.kpiTotal")} value={formatVnd(kpi.total)} />
          <Kpi label={t("tuition.kpiPaid")} value={formatVnd(kpi.paid)} tint="text-emerald-600" />
          <Kpi label={t("tuition.kpiOutstanding")} value={formatVnd(kpi.outstanding)} tint="text-amber-600" />
          <Kpi label={t("tuition.kpiOverdue")} value={formatVnd(kpi.overdue)} tint="text-red-600" />
        </div>

        <div className="flex gap-2 mb-4">
          <button className={cn("chip", tab === "invoices" && "active")} onClick={() => setTab("invoices")}>
            {t("tuition.tabInvoices")}
          </button>
          <button className={cn("chip", tab === "payments" && "active")} onClick={() => setTab("payments")}>
            {t("tuition.tabPayments")}
          </button>
        </div>

        {tab === "invoices" ? (
          <>
            <div className="flex items-center gap-3 mb-4 flex-wrap">
              <select className="field !w-auto !py-1.5" value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
                <option value="">{t("tuition.statusAll")}</option>
                {FILTERS.map((s) => (
                  <option key={s} value={s}>
                    {t(STATUS_KEY[s])}
                  </option>
                ))}
              </select>
              <input
                className="field !w-72 !py-1.5"
                placeholder={t("tuition.searchStudent")}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
              {canManageTuition && (
                <button className="btn-primary text-sm ml-auto" onClick={() => setCreateOpen(true)}>
                  {t("tuition.create")}
                </button>
              )}
            </div>

            {invoices.isLoading ? (
              <div className="text-sm text-muted py-12 text-center">{t("common.loading")}</div>
            ) : invoices.items.length === 0 ? (
              <div className="card p-12 text-center text-sm text-muted">{t("tuition.empty")}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tuition.colCode")}</th>
                    <th>{t("tuition.colStudent")}</th>
                    <th>{t("tuition.colPeriod")}</th>
                    <th>{t("tuition.colAmount")}</th>
                    <th>{t("tuition.colDue")}</th>
                    <th>{t("tuition.colStatus")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {invoices.items.map((inv) => {
                    const ds = invoiceDisplay(inv);
                    return (
                      <tr key={inv.id}>
                        <td className="font-mono text-xs">{inv.invoiceNumber}</td>
                        <td>{inv.student.fullName}</td>
                        <td>{inv.period}</td>
                        <td className="font-semibold">{formatVnd(inv.total)}</td>
                        <td>{formatDate(inv.dueDate)}</td>
                        <td>
                          <span className={`badge ${STATUS_BADGE[ds]}`}>{t(STATUS_KEY[ds])}</span>
                        </td>
                        <td className="whitespace-nowrap">
                          <Link to={`/tuition/${inv.id}`} className="text-[color:var(--primary)] text-xs font-semibold">
                            {t("tuition.view")}
                          </Link>
                          <button
                            className="text-slate-500 text-xs font-semibold ml-3"
                            onClick={() => openInvoicePrint(inv.id, (m) => toast(m, "error"), t)}
                          >
                            {t("tuition.print")}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
            <Pagination
              page={invoices.page}
              pages={invoices.pages}
              total={invoices.total}
              onPage={invoices.setPage}
              busy={invoices.isFetching}
            />
          </>
        ) : (
          <>
            <div className="text-xs text-slate-400 mb-3">{t("tuition.paymentsHint")}</div>
            {collected.length === 0 ? (
              <div className="card p-12 text-center text-sm text-muted">{t("tuition.paymentsEmpty")}</div>
            ) : (
              <table className="table">
                <thead>
                  <tr>
                    <th>{t("tuition.colCode")}</th>
                    <th>{t("tuition.colStudent")}</th>
                    <th>{t("tuition.colPaid")}</th>
                    <th>{t("tuition.colStatus")}</th>
                    <th></th>
                  </tr>
                </thead>
                <tbody>
                  {collected.map((inv) => (
                    <tr key={inv.id}>
                      <td className="font-mono text-xs">{inv.invoiceNumber}</td>
                      <td>{inv.student.fullName}</td>
                      <td className="font-semibold text-emerald-600">{formatVnd(inv.amountPaid)}</td>
                      <td>
                        <span className={`badge ${STATUS_BADGE[invoiceDisplay(inv)]}`}>
                          {t(STATUS_KEY[invoiceDisplay(inv)])}
                        </span>
                      </td>
                      <td>
                        <Link to={`/tuition/${inv.id}`} className="text-[color:var(--primary)] text-xs font-semibold">
                          {t("tuition.view")}
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </>
        )}
      </main>

      {createOpen && canManageTuition && <CreateInvoiceModal onClose={() => setCreateOpen(false)} />}
    </>
  );
}

function Kpi({ label, value, tint }: { label: string; value: string; tint?: string }) {
  return (
    <div className="kpi">
      <div className={cn("num !text-xl", tint)}>{value}</div>
      <div className="lbl">{label}</div>
    </div>
  );
}

export { STATUS_KEY as INVOICE_STATUS_KEY, STATUS_BADGE as INVOICE_STATUS_BADGE };
