/** Render chứng từ học phí ra HTML tự chứa (xem online + in giấy). Phục vụ lưu trữ/quyết toán. */

const money = (n: unknown) => new Intl.NumberFormat("vi-VN").format(Number(n)) + "₫";
const dateVi = (d: Date | string) => new Date(d).toLocaleDateString("vi-VN");
function esc(s: unknown): string {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

const STATUS_VI: Record<string, string> = {
  UNPAID: "Chưa thanh toán",
  PARTIAL: "Thanh toán một phần",
  PAID: "Đã thanh toán",
  OVERDUE: "Quá hạn",
  CANCELED: "Đã hủy",
};
const METHOD_VI: Record<string, string> = {
  CASH: "Tiền mặt",
  BANK_TRANSFER: "Chuyển khoản",
  VNPAY: "VNPay",
};

export interface PrintInvoice {
  invoiceNumber: string;
  period: string;
  issueDate: Date | string;
  dueDate: Date | string;
  subtotal: unknown;
  discount: unknown;
  total: unknown;
  amountPaid: unknown;
  status: string;
  note?: string | null;
  student: { fullName: string };
  items: { label: string; quantity: number; unitPrice: unknown; amount: unknown }[];
  payments: { method: string; status: string; amount: unknown; paidAt: Date | string | null }[];
}
export interface PrintOrg {
  displayName: string;
  taxCode?: string | null;
  invoiceAddress?: string | null;
  bankBin?: string | null;
  bankAccountNumber?: string | null;
  bankAccountName?: string | null;
  supportEmail?: string | null;
}

export function renderInvoiceHtml(inv: PrintInvoice, org: PrintOrg): string {
  const rows = inv.items
    .map(
      (it, i) => `<tr>
      <td class="c">${i + 1}</td>
      <td>${esc(it.label)}</td>
      <td class="c">${it.quantity}</td>
      <td class="r">${money(it.unitPrice)}</td>
      <td class="r">${money(it.amount)}</td>
    </tr>`,
    )
    .join("");
  const paid = inv.payments
    .filter((p) => p.status === "SUCCEEDED")
    .map(
      (p) => `<tr>
      <td>${esc(METHOD_VI[p.method] ?? p.method)}</td>
      <td>${p.paidAt ? dateVi(p.paidAt) : "—"}</td>
      <td class="r">${money(p.amount)}</td>
    </tr>`,
    )
    .join("");

  return `<!doctype html>
<html lang="vi"><head><meta charset="utf-8"/>
<meta name="viewport" content="width=device-width,initial-scale=1"/>
<title>Chứng từ ${esc(inv.invoiceNumber)}</title>
<style>
  *{box-sizing:border-box} body{font-family:-apple-system,"Segoe UI",Roboto,Arial,sans-serif;color:#0f172a;margin:0;background:#f1f5f9}
  .sheet{max-width:780px;margin:24px auto;background:#fff;padding:32px;border-radius:12px;box-shadow:0 1px 4px rgba(0,0,0,.08)}
  .top{display:flex;justify-content:space-between;align-items:flex-start;gap:24px;border-bottom:2px solid #e2e8f0;padding-bottom:16px}
  .org{font-size:18px;font-weight:700} .muted{color:#64748b;font-size:13px;line-height:1.5}
  h1{font-size:22px;margin:0 0 4px;text-align:right} .meta{font-size:13px;text-align:right;color:#475569}
  .grid{display:flex;gap:24px;margin:20px 0} .grid>div{flex:1}
  .label{font-size:12px;text-transform:uppercase;letter-spacing:.04em;color:#94a3b8;margin-bottom:4px}
  table{width:100%;border-collapse:collapse;margin-top:8px;font-size:14px}
  th,td{padding:8px 10px;border-bottom:1px solid #e2e8f0;text-align:left}
  th{background:#f8fafc;font-size:12px;text-transform:uppercase;color:#64748b}
  .c{text-align:center}.r{text-align:right}
  .totals{margin-left:auto;width:280px;font-size:14px;margin-top:12px}
  .totals .row{display:flex;justify-content:space-between;padding:4px 0}
  .totals .grand{border-top:2px solid #0f172a;margin-top:6px;padding-top:8px;font-weight:700;font-size:16px}
  .badge{display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:600}
  .b-paid{background:#dcfce7;color:#166534}.b-unpaid{background:#fef9c3;color:#854d0e}.b-over{background:#fee2e2;color:#991b1b}
  .note{margin-top:16px;font-size:13px;color:#475569}
  .actions{max-width:780px;margin:0 auto 24px;text-align:right}
  .btn{background:#2563eb;color:#fff;border:0;padding:10px 18px;border-radius:8px;font-size:14px;cursor:pointer}
  @media print{body{background:#fff}.actions{display:none}.sheet{box-shadow:none;margin:0;border-radius:0}}
</style></head>
<body>
  <div class="actions"><button class="btn" onclick="window.print()">In chứng từ</button></div>
  <div class="sheet">
    <div class="top">
      <div>
        <div class="org">${esc(org.displayName)}</div>
        <div class="muted">${org.invoiceAddress ? esc(org.invoiceAddress) + "<br/>" : ""}${org.taxCode ? "MST: " + esc(org.taxCode) + "<br/>" : ""}${org.supportEmail ? esc(org.supportEmail) : ""}</div>
      </div>
      <div>
        <h1>PHIẾU THU HỌC PHÍ</h1>
        <div class="meta">Số: <b>${esc(inv.invoiceNumber)}</b><br/>Ngày lập: ${dateVi(inv.issueDate)}<br/>Hạn TT: ${dateVi(inv.dueDate)}</div>
      </div>
    </div>
    <div class="grid">
      <div><div class="label">Học sinh</div><div><b>${esc(inv.student.fullName)}</b></div><div class="muted">Kỳ: ${esc(inv.period)}</div></div>
      <div style="text-align:right"><div class="label">Trạng thái</div>
        <span class="badge ${inv.status === "PAID" ? "b-paid" : inv.status === "OVERDUE" ? "b-over" : "b-unpaid"}">${esc(STATUS_VI[inv.status] ?? inv.status)}</span>
      </div>
    </div>
    <table>
      <thead><tr><th class="c">#</th><th>Khoản thu</th><th class="c">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead>
      <tbody>${rows}</tbody>
    </table>
    <div class="totals">
      <div class="row"><span>Tạm tính</span><span>${money(inv.subtotal)}</span></div>
      <div class="row"><span>Giảm giá</span><span>- ${money(inv.discount)}</span></div>
      <div class="row grand"><span>Tổng cộng</span><span>${money(inv.total)}</span></div>
      <div class="row"><span>Đã thanh toán</span><span>${money(inv.amountPaid)}</span></div>
      <div class="row"><span>Còn lại</span><span>${money(Number(inv.total) - Number(inv.amountPaid))}</span></div>
    </div>
    ${paid ? `<div class="label" style="margin-top:20px">Lịch sử thanh toán</div><table><thead><tr><th>Phương thức</th><th>Ngày</th><th class="r">Số tiền</th></tr></thead><tbody>${paid}</tbody></table>` : ""}
    ${org.bankBin && org.bankAccountNumber ? `<div class="note">Chuyển khoản: <b>${esc(org.bankAccountName ?? "")}</b> · STK ${esc(org.bankAccountNumber)} · Nội dung: <b>${esc(inv.invoiceNumber)}</b></div>` : ""}
    ${inv.note ? `<div class="note">Ghi chú: ${esc(inv.note)}</div>` : ""}
    <div class="note" style="text-align:center;margin-top:28px;color:#94a3b8">Chứng từ tạo bởi hệ thống KimThanh Kids — ${esc(org.displayName)}</div>
  </div>
</body></html>`;
}
