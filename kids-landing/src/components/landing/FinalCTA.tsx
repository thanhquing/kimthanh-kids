import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

export function FinalCTA() {
  return (
    <section className="py-20 md:py-28">
      <div className="container-narrow">
        <Reveal>
          <div className="relative overflow-hidden rounded-[2.5rem] gradient-cta-bg text-primary-foreground p-10 sm:p-16 text-center shadow-glow">
            <div
              aria-hidden
              className="absolute -top-10 -left-10 h-48 w-48 rounded-full bg-white/15 blur-3xl"
            />
            <div
              aria-hidden
              className="absolute -bottom-12 -right-10 h-56 w-56 rounded-full bg-sun/40 blur-3xl"
            />

            <Sparkles className="mx-auto h-10 w-10 text-sun mb-4" />
            <h2 className="font-display text-3xl sm:text-4xl lg:text-5xl font-bold leading-tight">
              Sẵn sàng đồng hành cùng con yêu?
            </h2>
            <p className="mt-4 text-base sm:text-lg text-primary-foreground/90 max-w-2xl mx-auto">
              Hơn 1.200 ngôi trường đã chọn KimThanh Kids để vận hành thông minh hơn. Hôm nay là
              ngày đẹp để bắt đầu.
            </p>
            <div className="mt-8 flex flex-wrap gap-3 justify-center">
              <Link
                to="/lien-he"
                className="inline-flex items-center gap-2 rounded-full bg-card text-foreground px-7 py-4 text-sm sm:text-base font-bold hover:-translate-y-0.5 transition-all shadow-card"
              >
                Dùng thử miễn phí ngay
                <ArrowRight className="h-4 w-4" />
              </Link>
              <Link
                to="/bang-gia"
                className="inline-flex items-center gap-2 rounded-full border-2 border-white/40 text-primary-foreground px-7 py-4 text-sm sm:text-base font-bold hover:bg-white/10 transition-all"
              >
                Xem báo giá
              </Link>
            </div>
            <p className="mt-6 text-xs text-primary-foreground/70">
              Miễn phí 30 ngày · Không cần thẻ tín dụng · Hỗ trợ cài đặt tận nơi
            </p>
          </div>
        </Reveal>
      </div>
    </section>
  );
}
