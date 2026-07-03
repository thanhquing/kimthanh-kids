import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link } from "@tanstack/react-router";
import { CheckCircle2, ExternalLink } from "lucide-react";
import { useMemo } from "react";
import { publicApi, type SignupResult } from "@/api/public";

export const Route = createFileRoute("/dang-ky/thanh-cong")({
  component: SignupSuccessPage,
  head: () => ({
    meta: [
      { title: "Đăng ký thành công — KimThanh Kids" },
      { name: "description", content: "Trường đã được tạo trên KimThanh Kids." },
    ],
  }),
});

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function vietQrUrl(invoice: {
  invoiceNumber: string;
  amountDue: number;
  bank: { bin?: string | null; accountNumber?: string | null; accountName?: string | null };
}): string | null {
  if (!invoice.bank.bin || !invoice.bank.accountNumber) return null;
  const params = new URLSearchParams({
    amount: String(Math.round(invoice.amountDue)),
    addInfo: invoice.invoiceNumber,
  });
  if (invoice.bank.accountName) params.set("accountName", invoice.bank.accountName);
  return `https://img.vietqr.io/image/${invoice.bank.bin}-${invoice.bank.accountNumber}-compact2.png?${params.toString()}`;
}

function SignupSuccessPage() {
  const result = useMemo<SignupResult | null>(() => {
    if (typeof window === "undefined") return null;
    const raw = sessionStorage.getItem("kk_signup_result");
    if (!raw) return null;
    try {
      return JSON.parse(raw) as SignupResult;
    } catch {
      return null;
    }
  }, []);
  const token = result?.upgradeInvoice?.publicToken;
  const invoice = useQuery({
    queryKey: ["public-invoice", token],
    queryFn: () => publicApi.invoice(token!),
    enabled: !!token,
  });
  const qr = invoice.data ? vietQrUrl(invoice.data) : null;

  if (!result) {
    return (
      <section className="pt-32 md:pt-40 pb-20 gradient-hero-bg">
        <div className="container-narrow max-w-2xl text-center">
          <h1 className="font-display text-4xl font-bold text-foreground">
            Không tìm thấy phiên đăng ký
          </h1>
          <p className="mt-4 text-muted-foreground">Bạn có thể tạo trường mới từ trang đăng ký.</p>
          <Link
            to="/dang-ky"
            className="mt-6 inline-flex rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground"
          >
            Đăng ký trường
          </Link>
        </div>
      </section>
    );
  }

  const crmUrl = `https://${result.tenant.host}`;

  return (
    <section className="pt-32 md:pt-40 pb-16 gradient-hero-bg">
      <div className="container-narrow grid gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
        <div className="rounded-3xl border border-border bg-card p-7 shadow-card">
          <div className="flex items-center gap-3">
            <span className="grid h-12 w-12 place-items-center rounded-full bg-mint/50 text-primary">
              <CheckCircle2 className="h-7 w-7" />
            </span>
            <div>
              <h1 className="font-display text-3xl font-bold text-foreground">
                Tạo trường thành công
              </h1>
              <p className="text-sm text-muted-foreground">Trường đã sẵn sàng ở gói Free.</p>
            </div>
          </div>

          <div className="mt-6 grid gap-4 sm:grid-cols-2">
            <Info label="Tên miền" value={result.tenant.host} />
            <Info label="Email quản trị" value={result.admin.email ?? "—"} />
            <Info label="Mã trường" value={result.tenant.code ?? "—"} />
            <Info label="Gói đã chọn" value={result.selectedPlan?.name ?? "Miễn phí"} />
          </div>

          <a
            href={crmUrl}
            className="mt-7 inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold text-accent-foreground shadow-glow"
          >
            Vào CRM
            <ExternalLink className="h-4 w-4" />
          </a>
        </div>

        {result.upgradeInvoice ? (
          <aside className="rounded-3xl border border-border bg-card p-7 shadow-card">
            <h2 className="font-display text-2xl font-bold text-foreground">Thanh toán VietQR</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Gói trả phí sẽ được kích hoạt sau khi KimThanh Kids xác nhận thanh toán.
            </p>
            <div className="mt-5 rounded-2xl bg-primary-soft p-4">
              <div className="text-xs text-muted-foreground">Số hóa đơn</div>
              <div className="font-bold text-foreground">{result.upgradeInvoice.invoiceNumber}</div>
              <div className="mt-3 text-xs text-muted-foreground">Số tiền</div>
              <div className="font-display text-3xl font-bold text-foreground">
                {money(result.upgradeInvoice.amountDue)}
              </div>
            </div>
            {qr ? (
              <img
                src={qr}
                alt="VietQR thanh toán"
                className="mt-5 w-full rounded-2xl border border-border"
              />
            ) : (
              <p className="mt-5 rounded-2xl bg-sun/25 p-4 text-sm text-foreground">
                Chưa cấu hình tài khoản ngân hàng nhận tiền. Vui lòng liên hệ KimThanh Kids để được
                hướng dẫn thanh toán.
              </p>
            )}
            {result.publicInvoiceUrl && (
              <a
                href={result.publicInvoiceUrl}
                className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-full border border-border bg-card px-5 py-3 text-sm font-bold text-foreground"
              >
                Xem hóa đơn
                <ExternalLink className="h-4 w-4" />
              </a>
            )}
          </aside>
        ) : (
          <aside className="rounded-3xl border border-border bg-card p-7 shadow-card">
            <h2 className="font-display text-2xl font-bold text-foreground">Bắt đầu cấu hình</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              Bạn có thể đăng nhập CRM để thêm lớp, giáo viên, học sinh và cấu hình thương hiệu
              trường.
            </p>
          </aside>
        )}
      </div>
    </section>
  );
}

function Info({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-2xl border border-border bg-background/50 p-4">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="mt-1 break-words font-semibold text-foreground">{value}</div>
    </div>
  );
}
