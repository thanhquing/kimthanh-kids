import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { ArrowRight, Calendar } from "lucide-react";
import { apiUrl } from "@/api/http";
import { publicApi } from "@/api/public";
import { Reveal } from "@/components/site/Reveal";

const BLOG_PLACEHOLDER_IMAGE = apiUrl("/public/assets/blog/blog-placeholder.webp");

function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

export function BlogPreview() {
  const { data, isLoading } = useQuery({
    queryKey: ["public-posts-preview"],
    queryFn: () => publicApi.posts(1, 3),
  });
  const posts = data?.items ?? [];

  if (!isLoading && posts.length === 0) return null;

  return (
    <section className="py-20 md:py-28">
      <div className="container-narrow">
        <Reveal>
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6">
            <div className="max-w-xl">
              <span className="inline-block rounded-full bg-mint/40 text-foreground px-4 py-1.5 text-xs font-semibold">
                📚 Blog & Kiến thức
              </span>
              <h2 className="mt-4 font-display text-3xl sm:text-4xl lg:text-5xl font-bold text-foreground">
                Đồng hành cùng bé bằng kiến thức đúng
              </h2>
            </div>
            <Link
              to="/tin-tuc"
              className="inline-flex items-center gap-2 rounded-full border border-border bg-card px-5 py-2.5 text-sm font-semibold hover:border-primary hover:text-primary transition self-start"
            >
              Tất cả bài viết <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Reveal>

        <div className="mt-12 grid gap-6 md:grid-cols-3">
          {posts.map((p, i) => (
            <Reveal key={p.slug} delay={i * 100}>
              <Link
                to="/tin-tuc/$slug"
                params={{ slug: p.slug }}
                className="group block rounded-3xl bg-card border border-border shadow-card hover:shadow-card-hover hover:-translate-y-1 transition-all overflow-hidden h-full"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={p.coverImageUrl ?? BLOG_PLACEHOLDER_IMAGE}
                    alt={p.title}
                    width={900}
                    height={640}
                    loading="lazy"
                    className="h-full w-full object-cover group-hover:scale-105 transition-transform duration-500"
                  />
                  <span className="absolute top-4 left-4 rounded-full bg-card/95 backdrop-blur px-3 py-1 text-xs font-semibold text-primary">
                    {p.category ?? "KimThanh Kids"}
                  </span>
                </div>
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <Calendar className="h-3.5 w-3.5" /> {formatDate(p.publishedAt)}
                  </div>
                  <h3 className="mt-3 font-display text-lg font-bold text-foreground group-hover:text-primary transition-colors">
                    {p.title}
                  </h3>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed flex-1">
                    {p.excerpt}
                  </p>
                  <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                    Đọc tiếp <ArrowRight className="h-4 w-4" />
                  </span>
                </div>
              </Link>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
