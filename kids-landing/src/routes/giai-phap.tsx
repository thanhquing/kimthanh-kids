import { createFileRoute } from "@tanstack/react-router";
import { Benefits } from "@/components/landing/Benefits";
import { FinalCTA } from "@/components/landing/FinalCTA";
import { Testimonials } from "@/components/landing/Testimonials";

export const Route = createFileRoute("/giai-phap")({
  component: SolutionsPage,
  head: () => ({
    meta: [
      { title: "Giải pháp — KimThanh Kids" },
      {
        name: "description",
        content:
          "Giải pháp KimThanh Kids dành riêng cho nhà trường, giáo viên và phụ huynh mầm non Việt Nam.",
      },
      { property: "og:title", content: "Giải pháp — KimThanh Kids" },
      {
        property: "og:description",
        content: "Ba trải nghiệm — một nền tảng, được thiết kế cho từng vai trò.",
      },
    ],
  }),
});

function SolutionsPage() {
  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Giải pháp
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Một nền tảng,{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              ba trải nghiệm trọn vẹn
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Dù bạn là nhà quản lý, giáo viên hay phụ huynh — KimThanh Kids được thiết kế để bạn cảm
            thấy được lắng nghe.
          </p>
        </div>
      </section>
      <Benefits />
      <Testimonials />
      <FinalCTA />
    </>
  );
}
