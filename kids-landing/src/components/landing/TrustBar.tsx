import { School, Users, Heart, TrendingDown } from "lucide-react";
import { Reveal } from "@/components/site/Reveal";

const stats = [
  { icon: School, value: "1.200+", label: "Trường mầm non", color: "bg-primary-soft text-primary" },
  {
    icon: Users,
    value: "20.000+",
    label: "Giáo viên đồng hành",
    color: "bg-accent-soft text-accent",
  },
  {
    icon: Heart,
    value: "150.000+",
    label: "Phụ huynh tin dùng",
    color: "bg-sun/30 text-foreground",
  },
  {
    icon: TrendingDown,
    value: "-20%",
    label: "Chi phí vận hành",
    color: "bg-mint/40 text-foreground",
  },
];

export function TrustBar() {
  return (
    <section className="relative -mt-10 md:-mt-14 z-10">
      <div className="container-narrow">
        <div className="rounded-3xl bg-card shadow-card-hover border border-border p-5 sm:p-8 grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
          {stats.map((s, i) => (
            <Reveal key={s.label} delay={i * 80}>
              <div className="flex items-center gap-3 sm:gap-4">
                <span
                  className={`grid h-12 w-12 sm:h-14 sm:w-14 place-items-center rounded-2xl ${s.color}`}
                >
                  <s.icon className="h-6 w-6" />
                </span>
                <div>
                  <p className="font-display text-2xl sm:text-3xl font-bold text-foreground leading-tight">
                    {s.value}
                  </p>
                  <p className="text-xs sm:text-sm text-muted-foreground">{s.label}</p>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
