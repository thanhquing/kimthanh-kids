import { useEffect, useState } from "react";
import useEmblaCarousel from "embla-carousel-react";
import Autoplay from "embla-carousel-autoplay";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";
import a1 from "@/assets/avatar-1.jpg";
import a2 from "@/assets/avatar-2.jpg";
import a3 from "@/assets/avatar-3.jpg";

const items = [
  {
    avatar: a1,
    name: "Cô Mai Phương",
    role: "Hiệu trưởng — Peace Montessori",
    quote:
      "KimThanh Kids giúp chúng tôi tiết kiệm hơn 30 giờ mỗi tuần cho công tác hành chính. Phụ huynh cũng yên tâm hơn rất nhiều khi theo dõi con mỗi ngày.",
    rating: 5,
  },
  {
    avatar: a2,
    name: "Cô Thu Hà",
    role: "Giáo viên — Mầm non Louis",
    quote:
      "Mình thực sự yêu phần nhật ký hoạt động. Chỉ vài chạm là cập nhật được khoảnh khắc của các bé, và phụ huynh phản hồi rất tích cực.",
    rating: 5,
  },
  {
    avatar: a3,
    name: "Chị Hồng Nhung",
    role: "Phụ huynh bé Sao — Mầm non Sao Việt",
    quote:
      "Mỗi tối hai mẹ con cùng xem ảnh và video con học hôm đó. Cảm giác như mình chưa từng rời xa con một giây nào.",
    rating: 5,
  },
  {
    avatar: a1,
    name: "Cô Lan Anh",
    role: "Quản lý hệ thống 5 cơ sở",
    quote:
      "Báo cáo tài chính, tuyển sinh đồng bộ giữa các cơ sở giúp ban giám hiệu ra quyết định nhanh và chính xác hơn rất nhiều.",
    rating: 5,
  },
];

export function Testimonials() {
  const [emblaRef, embla] = useEmblaCarousel({ loop: true, align: "start" }, [
    Autoplay({ delay: 5000, stopOnInteraction: false }),
  ]);
  const [, setTick] = useState(0);

  useEffect(() => {
    if (!embla) return;
    const onSelect = () => setTick((t) => t + 1);
    embla.on("select", onSelect);
    return () => {
      embla.off("select", onSelect);
    };
  }, [embla]);

  return (
    <section className="py-20 md:py-28">
      <div className="container-narrow">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-block rounded-full bg-sun/40 text-foreground px-4 py-1.5 text-xs font-semibold">
                🌟 Khách hàng nói về KimThanh Kids
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Niềm tin của hàng nghìn ngôi trường
              </h2>
            </div>
            <div className="flex gap-2">
              <button
                aria-label="Previous"
                onClick={() => embla?.scrollPrev()}
                className="grid h-11 w-11 place-items-center rounded-full bg-card border border-border hover:border-primary hover:text-primary transition"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
              <button
                aria-label="Next"
                onClick={() => embla?.scrollNext()}
                className="grid h-11 w-11 place-items-center rounded-full bg-card border border-border hover:border-primary hover:text-primary transition"
              >
                <ChevronRight className="h-5 w-5" />
              </button>
            </div>
          </div>
        </Reveal>

        <div className="mt-10 overflow-hidden" ref={emblaRef}>
          <div className="flex gap-5">
            {items.map((it, i) => (
              <article
                key={i}
                className="flex-[0_0_92%] sm:flex-[0_0_60%] lg:flex-[0_0_40%] rounded-3xl bg-card border border-border p-7 shadow-card hover:shadow-card-hover transition"
              >
                <Quote className="h-8 w-8 text-primary/30" />
                <div className="mt-3 flex gap-1">
                  {Array.from({ length: it.rating }).map((_, i) => (
                    <Star key={i} className="h-4 w-4 fill-sun text-sun" />
                  ))}
                </div>
                <p className="mt-4 text-foreground/85 leading-relaxed">"{it.quote}"</p>
                <div className="mt-6 flex items-center gap-3 pt-5 border-t border-border">
                  <img
                    src={it.avatar}
                    alt={it.name}
                    width={48}
                    height={48}
                    loading="lazy"
                    className="h-12 w-12 rounded-full object-cover ring-2 ring-primary-soft"
                  />
                  <div>
                    <p className="font-display font-bold text-foreground">{it.name}</p>
                    <p className="text-xs text-muted-foreground">{it.role}</p>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
