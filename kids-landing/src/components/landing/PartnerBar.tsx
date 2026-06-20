import { Reveal } from "@/components/site/Reveal";

const partners = [
  "Peace Montessori",
  "Mầm non Louis",
  "Sao Việt Kids",
  "Sunrise Academy",
  "Happy Bear",
  "Little Stars",
  "Rainbow Kids",
  "Eduplay+",
];

export function PartnerBar() {
  return (
    <section className="py-16 bg-surface border-y border-border">
      <div className="container-narrow">
        <Reveal>
          <p className="text-center text-sm font-semibold uppercase tracking-widest text-muted-foreground">
            Đối tác & Báo chí đã nhắc đến
          </p>
        </Reveal>
        <div className="mt-8 grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-x-4 gap-y-6 items-center">
          {partners.map((p, i) => (
            <Reveal key={p} delay={i * 50}>
              <div className="text-center font-display font-bold text-base sm:text-lg text-muted-foreground hover:text-primary transition-colors cursor-default">
                {p}
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
