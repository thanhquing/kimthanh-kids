import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { publicApi, type BillingCycle, type PublicPlan } from "@/api/public";

export const Route = createFileRoute("/bang-gia")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Báo giá — KimThanh Kids" },
      {
        name: "description",
        content:
          "Bảng giá linh hoạt theo quy mô trường mầm non (số giáo viên & học sinh). Bắt đầu miễn phí vĩnh viễn, không cần thẻ tín dụng.",
      },
      { property: "og:title", content: "Báo giá — KimThanh Kids" },
      { property: "og:description", content: "Lựa chọn gói phù hợp với mọi quy mô trường." },
    ],
  }),
});

const CYCLES: { value: BillingCycle; label: string; suffix: string }[] = [
  { value: "MONTHLY", label: "Tháng", suffix: "/ tháng" },
  { value: "QUARTERLY", label: "Quý", suffix: "/ quý" },
  { value: "ANNUAL", label: "Năm", suffix: "/ năm" },
];

const FEATURE_LABELS: Record<string, string> = {
  messaging: "Nhắn tin giáo viên - phụ huynh",
  media_gallery: "Album ảnh lớp cho phụ huynh",
  lesson_plan: "Giáo án cho giáo viên",
  analytics: "Báo cáo nâng cao + biểu đồ",
  api_access: "Tích hợp API/ERP riêng",
};

function money(value: number): string {
  return `${new Intl.NumberFormat("vi-VN").format(value)}đ`;
}

function limitNote(plan: PublicPlan): string {
  const limits = new Map(plan.limits.map((l) => [l.metric, l.limitValue]));
  const parts = [
    limits.get("TEACHERS") == null ? "Không giới hạn GV" : `${limits.get("TEACHERS")} giáo viên`,
    limits.get("STUDENTS") == null ? "Không giới hạn HS" : `${limits.get("STUDENTS")} học sinh`,
  ];
  const storage = limits.get("STORAGE_MB");
  if (storage != null) parts.push(`${Math.round(storage / 1024)} GB lưu trữ`);
  return parts.join(" · ");
}

function features(plan: PublicPlan): string[] {
  const enabled = plan.features
    .filter((f) => f.enabled)
    .map((f) => FEATURE_LABELS[f.featureKey] ?? f.featureKey);
  const base = [
    "Quản lý hồ sơ học sinh, giáo viên",
    "Điểm danh & nhật ký hằng ngày",
    "Hồ sơ sức khỏe, dặn thuốc, xin nghỉ",
  ];
  return [...base, ...enabled];
}

function priceFor(plan: PublicPlan, cycle: BillingCycle) {
  return plan.prices.find((p) => p.billingCycle === cycle) ?? plan.prices[0];
}

function PricingPage() {
  const [cycle, setCycle] = useState<BillingCycle>("MONTHLY");
  const {
    data: plans,
    isLoading,
    error,
  } = useQuery({
    queryKey: ["public-plans"],
    queryFn: () => publicApi.plans(),
  });

  return (
    <>
      <section className="pt-32 md:pt-40 pb-8 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Báo giá
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Linh hoạt theo{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              quy mô trường
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Bắt đầu miễn phí. Nâng cấp khi bạn sẵn sàng. Không phí ẩn, không ràng buộc.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-narrow mb-8 flex justify-center">
          <div className="inline-flex rounded-full border border-border bg-card p-1 shadow-card">
            {CYCLES.map((c) => (
              <button
                key={c.value}
                type="button"
                onClick={() => setCycle(c.value)}
                className={`rounded-full px-5 py-2 text-sm font-bold transition ${
                  cycle === c.value
                    ? "bg-primary text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {c.label}
              </button>
            ))}
          </div>
        </div>
        {isLoading && (
          <div className="container-narrow rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            Đang tải bảng giá...
          </div>
        )}
        {error && (
          <div className="container-narrow rounded-3xl border border-destructive/30 bg-card p-8 text-center text-destructive shadow-card">
            Chưa tải được bảng giá. Vui lòng thử lại sau.
          </div>
        )}
        <div className="container-narrow grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {(plans ?? []).map((p, i) => {
            const price = priceFor(p, cycle);
            const amount = Number(price?.amount ?? 0);
            const highlight = p.tier === "PRO";
            const contactOnly = p.tier === "ENTERPRISE" || amount <= 0;
            const href = contactOnly
              ? `/lien-he?plan=${p.code}`
              : `/dang-ky?plan=${p.code}&cycle=${price?.billingCycle ?? cycle}`;
            return (
              <Reveal key={p.code} delay={i * 100}>
                <article
                  className={`relative rounded-3xl p-7 sm:p-8 border h-full flex flex-col ${
                    highlight
                      ? "gradient-cta-bg text-primary-foreground shadow-glow border-transparent scale-100 md:scale-[1.04]"
                      : "bg-card border-border shadow-card hover:shadow-card-hover transition"
                  }`}
                >
                  {highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-sun text-foreground px-3 py-1 text-xs font-bold shadow-card">
                      <Sparkles className="h-3.5 w-3.5" /> Được chọn nhiều nhất
                    </span>
                  )}
                  <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                  <p
                    className={`mt-1 text-sm ${highlight ? "text-primary-foreground/85" : "text-muted-foreground"}`}
                  >
                    {limitNote(p)}
                  </p>
                  <div className="mt-5 flex items-baseline gap-1">
                    <span className="font-display text-4xl font-extrabold">
                      {contactOnly ? "Liên hệ" : money(amount)}
                    </span>
                    {!contactOnly && (
                      <span
                        className={
                          highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                        }
                      >
                        {CYCLES.find((c) => c.value === price?.billingCycle)?.suffix}
                      </span>
                    )}
                  </div>
                  <ul className="mt-6 space-y-3 flex-1">
                    {features(p).map((f) => (
                      <li key={f} className="flex items-start gap-2.5 text-sm">
                        <Check
                          className={`h-5 w-5 flex-none ${highlight ? "text-sun" : "text-primary"}`}
                          strokeWidth={3}
                        />
                        <span
                          className={
                            highlight ? "text-primary-foreground/95" : "text-foreground/85"
                          }
                        >
                          {f}
                        </span>
                      </li>
                    ))}
                  </ul>
                  <a
                    href={href}
                    className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition ${
                      highlight
                        ? "bg-card text-foreground hover:-translate-y-0.5"
                        : "bg-accent text-accent-foreground hover:brightness-110"
                    }`}
                  >
                    {contactOnly
                      ? "Nhận tư vấn"
                      : p.code === "free"
                        ? "Bắt đầu miễn phí"
                        : "Đăng ký gói này"}
                  </a>
                </article>
              </Reveal>
            );
          })}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
