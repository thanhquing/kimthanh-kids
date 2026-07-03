import { Link } from "@tanstack/react-router";
import { Play, ArrowRight, Heart, Star, Shield } from "lucide-react";
import heroImg from "@/assets/hero-kids.jpg";

export function Hero() {
  return (
    <section className="relative overflow-hidden pt-28 md:pt-36 pb-16 md:pb-24 gradient-hero-bg">
      {/* decorative blobs */}
      <div
        aria-hidden
        className="pointer-events-none absolute -top-20 -left-20 h-72 w-72 rounded-full bg-secondary/30 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute top-32 -right-24 h-80 w-80 rounded-full bg-accent/20 blur-3xl"
      />
      <div
        aria-hidden
        className="pointer-events-none absolute bottom-0 left-1/3 h-56 w-56 rounded-full bg-sun/30 blur-3xl"
      />

      <div className="container-narrow relative grid gap-12 lg:grid-cols-2 lg:items-center">
        <div className="animate-fade-in">
          <span className="inline-flex items-center gap-2 rounded-full bg-card/80 backdrop-blur px-4 py-1.5 text-xs font-semibold text-primary border border-primary/15 shadow-sm">
            <Heart className="h-3.5 w-3.5 fill-accent text-accent" />
            Tin yêu bởi 1.200+ trường mầm non
          </span>

          <h1 className="mt-6 font-display text-4xl sm:text-5xl lg:text-6xl font-bold leading-[1.05] text-foreground">
            Kết nối yêu thương,
            <br />
            <span className="bg-gradient-to-r from-primary via-secondary to-accent bg-clip-text text-transparent">
              nuôi dưỡng tương lai
            </span>{" "}
            bé yêu
          </h1>

          <p className="mt-5 text-lg text-muted-foreground max-w-xl leading-relaxed">
            KimThanh Kids là nền tảng quản lý mầm non toàn diện — giúp nhà trường vận hành thông
            minh, giáo viên nhẹ gánh sổ sách, và phụ huynh đồng hành cùng con mỗi ngày.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              to="/dang-ky"
              className="inline-flex items-center gap-2 rounded-full bg-accent text-accent-foreground px-6 py-3.5 text-sm font-semibold shadow-glow hover:brightness-110 hover:-translate-y-0.5 transition-all"
            >
              Bắt đầu miễn phí
              <ArrowRight className="h-4 w-4" />
            </Link>
            <a
              href="#demo"
              className="inline-flex items-center gap-2 rounded-full bg-card text-foreground border border-border px-6 py-3.5 text-sm font-semibold hover:border-primary hover:text-primary transition-all"
            >
              <span className="grid h-7 w-7 place-items-center rounded-full bg-primary text-primary-foreground">
                <Play className="h-3.5 w-3.5 fill-current" />
              </span>
              Xem demo video
            </a>
          </div>

          <div className="mt-10 flex flex-wrap items-center gap-6 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Shield className="h-4 w-4 text-primary" />
              Bảo mật chuẩn quốc tế
            </div>
            <div className="flex items-center gap-2">
              <div className="flex -space-x-0.5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <Star key={i} className="h-4 w-4 fill-sun text-sun" />
                ))}
              </div>
              <span>4.9/5 từ hơn 12.000 đánh giá</span>
            </div>
          </div>
        </div>

        <div className="relative">
          <div className="relative aspect-square max-w-[560px] mx-auto">
            {/* main image */}
            <div className="absolute inset-4 rounded-[2.5rem] overflow-hidden shadow-card-hover ring-1 ring-border bg-card">
              <img
                src={heroImg}
                alt="Trẻ em hạnh phúc cùng cô giáo tại trường mầm non KimThanh Kids"
                width={1024}
                height={1024}
                className="h-full w-full object-cover"
              />
            </div>

            {/* floating cards */}
            <div className="absolute -left-2 sm:-left-6 top-10 rounded-2xl bg-card shadow-card p-3.5 pr-5 flex items-center gap-3 animate-float">
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-mint/40 text-foreground">
                <Heart className="h-5 w-5 fill-coral text-coral" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground">Bé Sóc vừa được</p>
                <p className="text-sm font-semibold text-foreground">2 lời khen mới ✨</p>
              </div>
            </div>

            <div
              className="absolute -right-2 sm:-right-4 bottom-12 rounded-2xl bg-card shadow-card p-3.5 pr-5 flex items-center gap-3 animate-float"
              style={{ animationDelay: "1.2s" }}
            >
              <span className="grid h-10 w-10 place-items-center rounded-xl bg-sun/50 text-foreground">
                <Star className="h-5 w-5 fill-sun text-sun" />
              </span>
              <div>
                <p className="text-[11px] text-muted-foreground">Điểm danh AI</p>
                <p className="text-sm font-semibold text-foreground">28/30 bé có mặt</p>
              </div>
            </div>

            <div
              className="absolute right-6 -top-2 rounded-2xl gradient-cta-bg text-primary-foreground shadow-glow p-3.5 pr-5 animate-float"
              style={{ animationDelay: "0.6s" }}
            >
              <p className="text-[11px] opacity-90">Hôm nay</p>
              <p className="text-sm font-bold">Bé học vẽ tranh 🎨</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
