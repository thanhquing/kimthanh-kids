import { createFileRoute } from "@tanstack/react-router";
import { Hero } from "@/components/landing/Hero";
import { TrustBar } from "@/components/landing/TrustBar";
import { Features } from "@/components/landing/Features";
import { Benefits } from "@/components/landing/Benefits";
import { Testimonials } from "@/components/landing/Testimonials";
import { PartnerBar } from "@/components/landing/PartnerBar";
import { BlogPreview } from "@/components/landing/BlogPreview";
import { FinalCTA } from "@/components/landing/FinalCTA";

export const Route = createFileRoute("/")({
  component: Index,
  head: () => ({
    meta: [
      { title: "KimThanh Kids — Nền tảng quản lý mầm non kết nối yêu thương" },
      {
        name: "description",
        content:
          "Quản lý trường mầm non thông minh, kết nối phụ huynh — giáo viên — nhà trường. 1.200+ trường đã tin dùng.",
      },
    ],
  }),
});

function Index() {
  return (
    <>
      <Hero />
      <TrustBar />
      <Features />
      <Benefits />
      <Testimonials />
      <PartnerBar />
      <BlogPreview />
      <FinalCTA />
    </>
  );
}
