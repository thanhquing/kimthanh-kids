import { createFileRoute } from "@tanstack/react-router";
import { Features } from "@/components/landing/Features";
import { Benefits } from "@/components/landing/Benefits";
import { FinalCTA } from "@/components/landing/FinalCTA";

export const Route = createFileRoute("/tinh-nang")({
  component: FeaturesPage,
  head: () => ({
    meta: [
      { title: "Tính năng — KimThanh Kids" },
      {
        name: "description",
        content:
          "Khám phá toàn bộ tính năng của KimThanh Kids: quản lý trường, học phí online, nhật ký bé, điểm danh AI.",
      },
      { property: "og:title", content: "Tính năng — KimThanh Kids" },
      {
        property: "og:description",
        content: "Mọi thứ trường mầm non cần, gói gọn trong một nền tảng.",
      },
    ],
  }),
});

function FeaturesPage() {
  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Tính năng
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Vận hành mầm non,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              chưa bao giờ nhẹ nhàng đến thế
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Mọi nghiệp vụ cần thiết, được thiết kế tỉ mỉ với sự thấu hiểu các trường mầm non Việt
            Nam.
          </p>
        </div>
      </section>
      <Features />
      <Benefits />
      <FinalCTA />
    </>
  );
}
