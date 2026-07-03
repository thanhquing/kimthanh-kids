import { useQuery } from "@tanstack/react-query";
import { createFileRoute, Link, Outlet, useNavigate, useRouterState } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { Calendar, ArrowRight, Search, X } from "lucide-react";
import { apiUrl } from "@/api/http";
import { publicApi } from "@/api/public";
import { Reveal } from "@/components/site/Reveal";

const BLOG_PLACEHOLDER_IMAGE = apiUrl("/public/assets/blog/blog-placeholder.webp");

export const Route = createFileRoute("/tin-tuc")({
  validateSearch: (search): { q?: string; topic?: string; month?: string } => ({
    q: typeof search.q === "string" ? search.q : undefined,
    topic: typeof search.topic === "string" ? search.topic : undefined,
    month: typeof search.month === "string" ? search.month : undefined,
  }),
  component: BlogPage,
  head: () => ({
    links: [{ rel: "canonical", href: "https://kimthanhkids.vn/tin-tuc" }],
    meta: [
      { title: "Blog — KimThanh Kids" },
      {
        name: "description",
        content:
          "Kiến thức nuôi dạy trẻ, phương pháp giáo dục mầm non và câu chuyện từ cộng đồng KimThanh Kids.",
      },
      { property: "og:title", content: "Blog — KimThanh Kids" },
      {
        property: "og:description",
        content: "Kiến thức nuôi dạy & câu chuyện cộng đồng KimThanh Kids.",
      },
    ],
  }),
});

function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function monthKey(value?: string | null): string {
  if (!value) return "";
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

function monthLabel(key: string): string {
  const [year, month] = key.split("-");
  return `Tháng ${Number(month)}/${year}`;
}

function BlogPage() {
  const pathname = useRouterState({ select: (state) => state.location.pathname });
  const routeSearch = Route.useSearch();
  const navigate = useNavigate();
  const [search, setSearch] = useState(routeSearch.q ?? "");
  const [topic, setTopic] = useState(routeSearch.topic ?? "");
  const [month, setMonth] = useState(routeSearch.month ?? "");
  const { data, isLoading, error } = useQuery({
    queryKey: ["public-posts"],
    queryFn: () => publicApi.posts(1, 30),
  });
  const posts = useMemo(() => data?.items ?? [], [data?.items]);
  const topics = useMemo(() => {
    const set = new Set<string>();
    for (const post of posts) {
      if (post.category) set.add(post.category);
      for (const tag of post.tags ?? []) set.add(tag);
    }
    return [...set].sort((a, b) => a.localeCompare(b, "vi"));
  }, [posts]);
  const months = useMemo(() => {
    const set = new Set(posts.map((post) => monthKey(post.publishedAt)).filter(Boolean));
    return [...set].sort((a, b) => b.localeCompare(a));
  }, [posts]);
  const filteredPosts = useMemo(() => {
    const q = search.trim().toLowerCase();
    return posts.filter((post) => {
      const matchesSearch =
        !q ||
        post.title.toLowerCase().includes(q) ||
        (post.excerpt ?? "").toLowerCase().includes(q);
      const matchesTopic =
        !topic || post.category === topic || (post.tags ?? []).some((tag) => tag === topic);
      const matchesMonth = !month || monthKey(post.publishedAt) === month;
      return matchesSearch && matchesTopic && matchesMonth;
    });
  }, [month, posts, search, topic]);
  const hasFilters = search || topic || month;

  useEffect(() => {
    setSearch(routeSearch.q ?? "");
    setTopic(routeSearch.topic ?? "");
    setMonth(routeSearch.month ?? "");
  }, [routeSearch.month, routeSearch.q, routeSearch.topic]);

  function updateFilters(next: { q?: string; topic?: string; month?: string }) {
    const q = next.q ?? search;
    const t = next.topic ?? topic;
    const m = next.month ?? month;
    navigate({
      to: "/tin-tuc",
      search: {
        q: q || undefined,
        topic: t || undefined,
        month: m || undefined,
      },
      replace: true,
    });
  }

  function clearFilters() {
    setSearch("");
    setTopic("");
    setMonth("");
    navigate({ to: "/tin-tuc", search: {}, replace: true });
  }

  if (pathname !== "/tin-tuc") return <Outlet />;

  return (
    <>
      <section className="pt-32 md:pt-40 pb-12 gradient-hero-bg">
        <div className="container-narrow text-center max-w-3xl mx-auto">
          <span className="inline-block rounded-full bg-card text-primary px-4 py-1.5 text-xs font-semibold shadow-sm">
            Blog & Kiến thức
          </span>
          <h1 className="mt-4 font-display text-4xl sm:text-5xl lg:text-6xl font-bold text-foreground">
            Đồng hành cùng bé bằng{" "}
            <span className="bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              kiến thức đúng
            </span>
          </h1>
          <p className="mt-5 text-lg text-muted-foreground">
            Bài viết được biên tập bởi đội ngũ chuyên gia giáo dục mầm non và đối tác KimThanh Kids.
          </p>
        </div>
      </section>

      <section className="py-16 md:py-20">
        <div className="container-narrow mb-8 rounded-3xl border border-border bg-card p-4 shadow-card sm:p-5">
          <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_220px_180px_auto]">
            <label className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  updateFilters({ q: e.target.value });
                }}
                placeholder="Tìm bài viết..."
                className="h-11 w-full rounded-2xl border border-border bg-background px-10 text-sm text-foreground outline-none transition focus:border-primary"
              />
            </label>
            <select
              value={topic}
              onChange={(e) => {
                setTopic(e.target.value);
                updateFilters({ topic: e.target.value });
              }}
              className="h-11 rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Tất cả chủ đề</option>
              {topics.map((item) => (
                <option key={item} value={item}>
                  {item}
                </option>
              ))}
            </select>
            <select
              value={month}
              onChange={(e) => {
                setMonth(e.target.value);
                updateFilters({ month: e.target.value });
              }}
              className="h-11 rounded-2xl border border-border bg-background px-3 text-sm text-foreground outline-none transition focus:border-primary"
            >
              <option value="">Mọi thời gian</option>
              {months.map((item) => (
                <option key={item} value={item}>
                  {monthLabel(item)}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={clearFilters}
              disabled={!hasFilters}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-2xl border border-border px-4 text-sm font-semibold text-foreground transition hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-40"
            >
              <X className="h-4 w-4" />
              Xóa lọc
            </button>
          </div>
          {topics.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {topics.slice(0, 8).map((item) => (
                <button
                  key={item}
                  type="button"
                  onClick={() => {
                    const next = topic === item ? "" : item;
                    setTopic(next);
                    updateFilters({ topic: next });
                  }}
                  className={`rounded-full px-3 py-1.5 text-xs font-semibold transition ${
                    topic === item
                      ? "bg-primary text-primary-foreground"
                      : "bg-primary-soft text-primary hover:bg-primary hover:text-primary-foreground"
                  }`}
                >
                  {item}
                </button>
              ))}
            </div>
          )}
        </div>

        {isLoading && (
          <div className="container-narrow rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            Đang tải bài viết...
          </div>
        )}
        {error && (
          <div className="container-narrow rounded-3xl border border-destructive/30 bg-card p-8 text-center text-destructive shadow-card">
            Chưa tải được bài viết. Vui lòng thử lại sau.
          </div>
        )}
        <div className="container-narrow grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {filteredPosts.map((p, i) => (
            <Reveal key={p.slug} delay={(i % 3) * 80}>
              <Link
                to="/tin-tuc/$slug"
                params={{ slug: p.slug }}
                className="group block h-full overflow-hidden rounded-3xl border border-border bg-card shadow-card transition-all hover:-translate-y-1 hover:shadow-card-hover"
              >
                <div className="relative aspect-[16/10] overflow-hidden">
                  <img
                    src={p.coverImageUrl ?? BLOG_PLACEHOLDER_IMAGE}
                    alt={p.title}
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
        {!isLoading && !error && posts.length === 0 && (
          <div className="container-narrow rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            Chưa có bài viết được xuất bản.
          </div>
        )}
        {!isLoading && !error && posts.length > 0 && filteredPosts.length === 0 && (
          <div className="container-narrow rounded-3xl border border-border bg-card p-8 text-center text-muted-foreground shadow-card">
            Không tìm thấy bài viết phù hợp với bộ lọc.
          </div>
        )}
      </section>
    </>
  );
}
