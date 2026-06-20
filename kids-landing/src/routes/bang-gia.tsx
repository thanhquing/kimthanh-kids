import { createFileRoute, Link } from "@tanstack/react-router";
import { Check, Sparkles } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import { FinalCTA } from "@/components/landing/FinalCTA";

export const Route = createFileRoute("/bang-gia")({
  component: PricingPage,
  head: () => ({
    meta: [
      { title: "Báo giá — KimThanh Kids" },
      {
        name: "description",
        content:
          "Bảng giá linh hoạt theo quy mô trường mầm non. Dùng thử miễn phí 30 ngày, không cần thẻ tín dụng.",
      },
      { property: "og:title", content: "Báo giá — KimThanh Kids" },
      { property: "og:description", content: "Lựa chọn gói phù hợp với mọi quy mô trường." },
    ],
  }),
});

const plans = [
  {
    name: "Khởi đầu",
    price: "Miễn phí",
    note: "Cho trường dưới 50 bé",
    features: [
      "Quản lý hồ sơ học sinh, giáo viên",
      "Điểm danh cơ bản",
      "Nhật ký hoạt động hằng ngày",
      "Hỗ trợ qua email",
    ],
    cta: "Bắt đầu miễn phí",
    highlight: false,
  },
  {
    name: "Chuyên nghiệp",
    price: "1.200.000đ",
    suffix: "/ tháng",
    note: "Phổ biến nhất cho trường 50–200 bé",
    features: [
      "Toàn bộ tính năng gói Khởi đầu",
      "Học phí & thanh toán online",
      "Điểm danh AI nhận diện khuôn mặt",
      "Báo cáo nâng cao + biểu đồ",
      "Hỗ trợ ưu tiên 7 ngày/tuần",
    ],
    cta: "Dùng thử 30 ngày",
    highlight: true,
  },
  {
    name: "Hệ thống",
    price: "Liên hệ",
    note: "Cho chuỗi nhiều cơ sở",
    features: [
      "Toàn bộ tính năng gói Chuyên nghiệp",
      "Quản lý đa cơ sở, đa thương hiệu",
      "Tích hợp API, ERP riêng",
      "Quản lý tài khoản riêng (CSM)",
      "SLA cam kết, đào tạo tận nơi",
    ],
    cta: "Nhận tư vấn",
    highlight: false,
  },
];

function PricingPage() {
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
        <div className="container-narrow grid gap-6 md:grid-cols-3">
          {plans.map((p, i) => (
            <Reveal key={p.name} delay={i * 100}>
              <article
                className={`relative rounded-3xl p-7 sm:p-8 border h-full flex flex-col ${
                  p.highlight
                    ? "gradient-cta-bg text-primary-foreground shadow-glow border-transparent scale-100 md:scale-[1.04]"
                    : "bg-card border-border shadow-card hover:shadow-card-hover transition"
                }`}
              >
                {p.highlight && (
                  <span className="absolute -top-3 left-1/2 -translate-x-1/2 inline-flex items-center gap-1 rounded-full bg-sun text-foreground px-3 py-1 text-xs font-bold shadow-card">
                    <Sparkles className="h-3.5 w-3.5" /> Được chọn nhiều nhất
                  </span>
                )}
                <h3 className="font-display text-2xl font-bold">{p.name}</h3>
                <p
                  className={`mt-1 text-sm ${p.highlight ? "text-primary-foreground/85" : "text-muted-foreground"}`}
                >
                  {p.note}
                </p>
                <div className="mt-5 flex items-baseline gap-1">
                  <span className="font-display text-4xl font-extrabold">{p.price}</span>
                  {p.suffix && (
                    <span
                      className={
                        p.highlight ? "text-primary-foreground/80" : "text-muted-foreground"
                      }
                    >
                      {p.suffix}
                    </span>
                  )}
                </div>
                <ul className="mt-6 space-y-3 flex-1">
                  {p.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5 text-sm">
                      <Check
                        className={`h-5 w-5 flex-none ${p.highlight ? "text-sun" : "text-primary"}`}
                        strokeWidth={3}
                      />
                      <span
                        className={
                          p.highlight ? "text-primary-foreground/95" : "text-foreground/85"
                        }
                      >
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>
                <Link
                  to="/lien-he"
                  className={`mt-8 inline-flex items-center justify-center rounded-full px-5 py-3 text-sm font-bold transition ${
                    p.highlight
                      ? "bg-card text-foreground hover:-translate-y-0.5"
                      : "bg-accent text-accent-foreground hover:brightness-110"
                  }`}
                >
                  {p.cta}
                </Link>
              </article>
            </Reveal>
          ))}
        </div>
      </section>
      <FinalCTA />
    </>
  );
}
