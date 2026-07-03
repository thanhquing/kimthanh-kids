import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, CheckCircle2, Clock3 } from "lucide-react";
import { publicApi } from "@/api/public";

export const Route = createFileRoute("/hoa-don/$token")({
  loader: ({ params }) => publicApi.invoice(params.token),
  component: PublicInvoicePage,
  head: ({ loaderData }) => ({
    meta: [
      { title: `Hóa đơn ${loaderData?.invoiceNumber ?? ""} — KimThanh Kids` },
      {
        name: "description",
        content: `Hóa đơn nền tảng KimThanh Kids ${loaderData?.invoiceNumber ?? ""}`,
      },
    ],
  }),
});

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function vietQrUrl(invoice: ReturnType<typeof Route.useLoaderData>): string | null {
  if (!invoice.bank.bin || !invoice.bank.accountNumber) return null;
  const params = new URLSearchParams({
    amount: String(Math.round(invoice.amountDue)),
    addInfo: invoice.invoiceNumber,
  });
  if (invoice.bank.accountName) params.set("accountName", invoice.bank.accountName);
  return `https://img.vietqr.io/image/${invoice.bank.bin}-${invoice.bank.accountNumber}-compact2.png?${params.toString()}`;
}

function PublicInvoicePage() {
  const invoice = Route.useLoaderData();
  const qr = vietQrUrl(invoice);

  return (
    <section className="pt-32 md:pt-40 pb-16 gradient-hero-bg">
      <div className="container-narrow grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <article className="rounded-3xl border border-border bg-card p-7 shadow-card">
          <Link
            to="/"
            className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
          >
            <ArrowLeft className="h-4 w-4" />
            KimThanh Kids
          </Link>
          <div className="mt-6 flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-primary-soft text-primary">
              {invoice.status === "PAID" ? (
                <CheckCircle2 className="h-7 w-7" />
              ) : (
                <Clock3 className="h-7 w-7" />
              )}
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Hóa đơn {invoice.invoiceNumber}
              </h1>
              <p className="text-sm text-muted-foreground">Trạng thái: {invoice.status}</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Tổng tiền" value={money(invoice.total)} />
            <Info label="Còn phải thu" value={money(invoice.amountDue)} />
            <Info label="Ngân hàng" value={invoice.bank.bin ?? "—"} />
            <Info label="Số tài khoản" value={invoice.bank.accountNumber ?? "—"} />
            <Info label="Tên tài khoản" value={invoice.bank.accountName ?? "—"} wide />
            <Info label="Nội dung chuyển khoản" value={invoice.invoiceNumber} wide />
          </div>
        </article>

        <aside className="h-fit rounded-3xl border border-border bg-card p-7 shadow-card">
          <h2 className="font-display text-2xl font-bold text-foreground">VietQR</h2>
          {qr ? (
            <img
              src={qr}
              alt="VietQR thanh toán"
              className="mt-5 w-full rounded-2xl border border-border"
            />
          ) : (
            <p className="mt-5 rounded-2xl bg-sun/25 p-4 text-sm text-foreground">
              Chưa có cấu hình tài khoản ngân hàng. Vui lòng liên hệ KimThanh Kids để được hướng dẫn
              thanh toán.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function Info({ label, value, wide }: { label: string; value: string; wide?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-border bg-background/50 p-4 ${wide ? "sm:col-span-2" : ""}`}
    >
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
