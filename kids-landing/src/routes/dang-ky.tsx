import { useMutation, useQuery } from "@tanstack/react-query";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { CheckCircle2, School, UserRound } from "lucide-react";
import { useMemo, useState } from "react";
import { publicApi, type BillingCycle, type SignupInput } from "@/api/public";
import { errorMessage } from "@/lib/errorMessage";

export const Route = createFileRoute("/dang-ky")({
  validateSearch: (search): { plan?: string; cycle?: BillingCycle } => ({
    plan: typeof search.plan === "string" ? search.plan : undefined,
    cycle:
      search.cycle === "QUARTERLY" || search.cycle === "ANNUAL" || search.cycle === "MONTHLY"
        ? (search.cycle as BillingCycle)
        : undefined,
  }),
  component: SignupPage,
  head: () => ({
    meta: [
      { title: "Đăng ký trường — KimThanh Kids" },
      {
        name: "description",
        content:
          "Tự đăng ký trường mầm non trên KimThanh Kids, dùng Free ngay và nâng gói bằng VietQR khi cần.",
      },
    ],
  }),
});

const ROOT_DOMAIN = (import.meta.env.VITE_ROOT_DOMAIN as string | undefined) || "kimthanhkids.vn";

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function normalizeSlug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32);
}

function Field({
  label,
  children,
  hint,
}: {
  label: string;
  children: React.ReactNode;
  hint?: string;
}) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-foreground">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>}
    </label>
  );
}

function SignupPage() {
  const search = Route.useSearch();
  const navigate = useNavigate();
  const [form, setForm] = useState<SignupInput>({
    schoolName: "",
    slug: "",
    code: "",
    taxCode: "",
    phone: "",
    adminFullName: "",
    adminEmail: "",
    adminPassword: "",
    planCode: search.plan ?? "free",
    billingCycle: search.cycle ?? "MONTHLY",
    acceptConsent: false,
  });
  const [consentDoc, setConsentDoc] = useState<null | "TERMS" | "PRIVACY">(null);

  const legalQuery = useQuery({ queryKey: ["public-legal"], queryFn: () => publicApi.legal() });
  const legalDocs = legalQuery.data ?? [];
  const openDoc = legalDocs.find((d) => d.type === consentDoc) ?? null;

  const plansQuery = useQuery({ queryKey: ["public-plans"], queryFn: () => publicApi.plans() });
  const plans = plansQuery.data ?? [];
  const selectedPlan = plans.find((p) => p.code === form.planCode) ?? plans[0];
  const selectedPrice =
    selectedPlan?.prices.find((p) => p.billingCycle === form.billingCycle) ??
    selectedPlan?.prices[0];
  const amount = Number(selectedPrice?.amount ?? 0);
  const availability = useQuery({
    queryKey: ["slug-availability", form.slug],
    queryFn: () => publicApi.availability(form.slug),
    enabled: form.slug.length >= 3,
  });

  const priceLabel = useMemo(() => {
    if (!selectedPlan) return "Đang tải gói...";
    if (selectedPlan.tier === "ENTERPRISE" || amount <= 0) return "Miễn phí/ Liên hệ";
    return `${money(amount)} · ${form.billingCycle}`;
  }, [amount, form.billingCycle, selectedPlan]);

  const signup = useMutation({
    mutationFn: () =>
      publicApi.signup({
        ...form,
        code: form.code || undefined,
        phone: form.phone || undefined,
        planCode: form.planCode || "free",
        billingCycle: form.billingCycle || "MONTHLY",
      }),
    onSuccess: (data) => {
      sessionStorage.setItem("kk_signup_result", JSON.stringify(data));
      navigate({ to: "/dang-ky/thanh-cong" });
    },
  });

  const cannotSubmit =
    !form.schoolName ||
    !form.slug ||
    !form.taxCode ||
    !form.adminEmail ||
    !form.adminPassword ||
    !form.adminFullName ||
    !form.acceptConsent ||
    availability.data?.available === false ||
    selectedPlan?.tier === "ENTERPRISE";

  return (
    <>
      <section className="pt-32 md:pt-40 pb-10 gradient-hero-bg">
        <div className="container-narrow max-w-3xl text-center">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Đăng ký trường
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl font-bold text-foreground">
            Tạo trường KimThanh Kids trong vài phút
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Trường được kích hoạt Free ngay. Nếu chọn gói trả phí, bạn chuyển khoản VietQR để
            KimThanh Kids xác nhận và nâng gói.
          </p>
        </div>
      </section>

      <section className="py-12 md:py-16">
        <form
          className="container-narrow grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]"
          onSubmit={(e) => {
            e.preventDefault();
            signup.mutate();
          }}
        >
          <div className="space-y-6">
            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <School className="h-6 w-6 text-primary" />
                Thông tin trường
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Tên trường *">
                  <input
                    className="form-input"
                    value={form.schoolName}
                    onChange={(e) => setForm((f) => ({ ...f, schoolName: e.target.value }))}
                    placeholder="Mầm non Hoa Sen"
                  />
                </Field>
                <Field
                  label="Slug subdomain *"
                  hint={
                    form.slug.length >= 3
                      ? availability.data?.available === false
                        ? availability.data.reason
                        : `${form.slug}.${ROOT_DOMAIN}`
                      : "3-32 ký tự, chữ thường/số/gạch ngang"
                  }
                >
                  <input
                    className="form-input"
                    value={form.slug}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, slug: normalizeSlug(e.target.value) }))
                    }
                    placeholder="hoasen"
                  />
                </Field>
                <Field label="Mã số thuế *">
                  <input
                    className="form-input"
                    value={form.taxCode}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        taxCode: e.target.value.replace(/\D/g, "").slice(0, 13),
                      }))
                    }
                    placeholder="10 hoặc 13 chữ số"
                  />
                </Field>
                <Field label="Mã trường">
                  <input
                    className="form-input"
                    value={form.code}
                    onChange={(e) => setForm((f) => ({ ...f, code: e.target.value.toUpperCase() }))}
                    placeholder="HOASEN2026"
                  />
                </Field>
                <Field label="Số điện thoại">
                  <input
                    className="form-input"
                    value={form.phone}
                    onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
                    placeholder="0912 345 678"
                  />
                </Field>
              </div>
            </div>

            <div className="rounded-3xl border border-border bg-card p-6 shadow-card">
              <h2 className="flex items-center gap-2 font-display text-2xl font-bold">
                <UserRound className="h-6 w-6 text-primary" />
                Tài khoản chủ trường
              </h2>
              <div className="mt-5 grid gap-5 sm:grid-cols-2">
                <Field label="Họ tên *">
                  <input
                    className="form-input"
                    value={form.adminFullName}
                    onChange={(e) => setForm((f) => ({ ...f, adminFullName: e.target.value }))}
                    placeholder="Nguyễn Thị Mai"
                  />
                </Field>
                <Field label="Email đăng nhập *">
                  <input
                    className="form-input"
                    type="email"
                    value={form.adminEmail}
                    onChange={(e) => setForm((f) => ({ ...f, adminEmail: e.target.value }))}
                    placeholder="mai@school.edu.vn"
                  />
                </Field>
                <Field label="Mật khẩu *" hint="Tối thiểu 8 ký tự">
                  <input
                    className="form-input"
                    type="password"
                    value={form.adminPassword}
                    onChange={(e) => setForm((f) => ({ ...f, adminPassword: e.target.value }))}
                  />
                </Field>
              </div>
            </div>
          </div>

          <aside className="h-fit rounded-3xl border border-border bg-card p-6 shadow-card lg:sticky lg:top-24">
            <h2 className="font-display text-2xl font-bold">Gói đăng ký</h2>
            <div className="mt-5 space-y-4">
              <Field label="Gói">
                <select
                  className="form-input"
                  value={form.planCode}
                  onChange={(e) => setForm((f) => ({ ...f, planCode: e.target.value }))}
                >
                  {plans.map((p) => (
                    <option key={p.code} value={p.code}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </Field>
              <Field label="Chu kỳ">
                <select
                  className="form-input"
                  value={form.billingCycle}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, billingCycle: e.target.value as BillingCycle }))
                  }
                >
                  <option value="MONTHLY">Tháng</option>
                  <option value="QUARTERLY">Quý</option>
                  <option value="ANNUAL">Năm</option>
                </select>
              </Field>
              <div className="rounded-2xl bg-primary-soft p-4">
                <div className="text-sm text-muted-foreground">Tạm tính</div>
                <div className="mt-1 font-display text-3xl font-bold text-foreground">
                  {priceLabel}
                </div>
                <p className="mt-2 text-xs text-muted-foreground">
                  Gói Free dùng được ngay. Gói trả phí kích hoạt sau khi KimThanh Kids xác nhận
                  thanh toán.
                </p>
              </div>
              <label className="flex items-start gap-2.5 text-xs text-muted-foreground">
                <input
                  type="checkbox"
                  className="mt-0.5 h-4 w-4 shrink-0"
                  checked={form.acceptConsent}
                  onChange={(e) => setForm((f) => ({ ...f, acceptConsent: e.target.checked }))}
                />
                <span>
                  Tôi đã đọc và đồng ý với{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() => setConsentDoc("TERMS")}
                  >
                    Điều khoản dịch vụ
                  </button>{" "}
                  và{" "}
                  <button
                    type="button"
                    className="font-semibold text-primary underline"
                    onClick={() => setConsentDoc("PRIVACY")}
                  >
                    Chính sách bảo mật
                  </button>
                  , bao gồm việc trường tự chịu trách nhiệm xin phép người giám hộ khi nhập dữ liệu
                  trẻ em.
                </span>
              </label>
              <button
                type="submit"
                disabled={cannotSubmit || signup.isPending}
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-accent px-6 py-3.5 text-sm font-bold text-accent-foreground shadow-glow transition hover:brightness-110 disabled:opacity-60"
              >
                <CheckCircle2 className="h-5 w-5" />
                {signup.isPending ? "Đang tạo trường..." : "Tạo trường"}
              </button>
              {selectedPlan?.tier === "ENTERPRISE" && (
                <p className="text-xs text-destructive">
                  Gói Hệ thống cần tư vấn riêng. Vui lòng dùng trang Liên hệ.
                </p>
              )}
              {signup.error && (
                <p className="text-sm text-destructive">
                  {errorMessage(signup.error, "Đăng ký chưa thành công")}
                </p>
              )}
            </div>
          </aside>
        </form>
      </section>

      {openDoc && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setConsentDoc(null)}
        >
          <div
            className="flex max-h-[85vh] w-full max-w-2xl flex-col rounded-2xl bg-card shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-border px-6 py-4">
              <h3 className="font-display text-lg font-bold text-foreground">
                {openDoc.title}{" "}
                <span className="text-xs font-normal text-muted-foreground">
                  (v{openDoc.version})
                </span>
              </h3>
              <button
                type="button"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setConsentDoc(null)}
                aria-label="Đóng"
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto whitespace-pre-wrap px-6 py-4 text-sm leading-relaxed text-foreground">
              {openDoc.body}
            </div>
            <div className="border-t border-border px-6 py-4">
              <button
                type="button"
                className="inline-flex w-full items-center justify-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-bold text-primary-foreground transition hover:brightness-110"
                onClick={() => {
                  setForm((f) => ({ ...f, acceptConsent: true }));
                  setConsentDoc(null);
                }}
              >
                Tôi đã đọc & đồng ý
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        .form-input {
          width: 100%;
          border-radius: 0.875rem;
          border: 1px solid var(--color-border);
          background: var(--color-card);
          padding: 0.7rem 0.95rem;
          font-size: 0.9rem;
          color: var(--color-foreground);
        }
        .form-input:focus {
          outline: none;
          border-color: var(--color-primary);
          box-shadow: 0 0 0 4px color-mix(in oklab, var(--color-primary) 15%, transparent);
        }
      `}</style>
    </>
  );
}
