import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft, ArrowRight, Calendar, Tag } from "lucide-react";
import { apiUrl } from "@/api/http";
import { publicApi } from "@/api/public";

const SITE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || "https://kimthanhkids.vn";
const BLOG_PLACEHOLDER_IMAGE = apiUrl("/public/assets/blog/blog-placeholder.webp");

export const Route = createFileRoute("/tin-tuc/$slug")({
  loader: async ({ params }) => {
    const post = await publicApi.post(params.slug);
    const posts = await publicApi.posts(1, 30).catch(() => ({ items: [] }));
    const related = posts.items
      .filter((item) => item.slug !== post.slug)
      .map((item) => ({
        item,
        score:
          (post.category && item.category === post.category ? 2 : 0) +
          (item.tags.some((tag) => post.tags.includes(tag)) ? 1 : 0),
      }))
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return (b.item.publishedAt ?? "").localeCompare(a.item.publishedAt ?? "");
      })
      .map(({ item }) => item)
      .slice(0, 3);
    return { post, related };
  },
  component: BlogDetailPage,
  head: ({ loaderData }) => ({
    links: [
      {
        rel: "canonical",
        href: `${SITE_URL}/tin-tuc/${loaderData?.post?.slug ?? ""}`,
      },
    ],
    meta: [
      {
        title: `${loaderData?.post?.seoTitle ?? loaderData?.post?.title ?? "Tin tức"} — KimThanh Kids`,
      },
      {
        name: "description",
        content: loaderData?.post?.seoDescription ?? loaderData?.post?.excerpt ?? "",
      },
      { name: "keywords", content: loaderData?.post?.tags.join(", ") ?? "" },
      { property: "og:type", content: "article" },
      {
        property: "og:title",
        content: loaderData?.post?.seoTitle ?? loaderData?.post?.title ?? "Tin tức",
      },
      {
        property: "og:description",
        content: loaderData?.post?.seoDescription ?? loaderData?.post?.excerpt ?? "",
      },
      { property: "og:url", content: `${SITE_URL}/tin-tuc/${loaderData?.post?.slug ?? ""}` },
      { property: "og:image", content: absoluteUrl(loaderData?.post?.coverImageUrl) },
      { property: "article:published_time", content: loaderData?.post?.publishedAt ?? "" },
      { property: "article:section", content: loaderData?.post?.category ?? "KimThanh Kids" },
      { name: "twitter:card", content: "summary_large_image" },
      {
        name: "twitter:title",
        content: loaderData?.post?.seoTitle ?? loaderData?.post?.title ?? "Tin tức",
      },
      {
        name: "twitter:description",
        content: loaderData?.post?.seoDescription ?? loaderData?.post?.excerpt ?? "",
      },
      { name: "twitter:image", content: absoluteUrl(loaderData?.post?.coverImageUrl) },
    ],
  }),
});

function absoluteUrl(value?: string | null): string {
  if (!value) return BLOG_PLACEHOLDER_IMAGE;
  if (/^https?:\/\//.test(value)) return value;
  return `${SITE_URL}${value.startsWith("/") ? value : `/${value}`}`;
}

function formatDate(value?: string | null): string {
  if (!value) return "";
  return new Intl.DateTimeFormat("vi-VN").format(new Date(value));
}

function Markdown({ markdown }: { markdown: string }) {
  const blocks = markdown.split(/\n{2,}/).filter(Boolean);
  return (
    <div className="mx-auto mt-10 max-w-3xl space-y-5 text-foreground/85">
      {blocks.map((block, index) => {
        if (block.startsWith("# ")) {
          return (
            <h2 key={index} className="font-display text-3xl font-bold text-foreground">
              {block.replace(/^# /, "")}
            </h2>
          );
        }
        if (block.startsWith("## ")) {
          return (
            <h3 key={index} className="font-display text-2xl font-bold text-foreground">
              {block.replace(/^## /, "")}
            </h3>
          );
        }
        return (
          <p key={index} className="whitespace-pre-line text-base leading-8">
            {block}
          </p>
        );
      })}
    </div>
  );
}

function BlogDetailPage() {
  const { post, related } = Route.useLoaderData();
  const coverImageUrl = post.coverImageUrl ?? BLOG_PLACEHOLDER_IMAGE;
  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "BlogPosting",
    headline: post.title,
    description: post.seoDescription ?? post.excerpt ?? "",
    image: [absoluteUrl(post.coverImageUrl)],
    datePublished: post.publishedAt,
    dateModified: post.publishedAt,
    author: { "@type": "Organization", name: "KimThanh Kids" },
    publisher: {
      "@type": "Organization",
      name: "KimThanh Kids",
      logo: { "@type": "ImageObject", url: `${SITE_URL}/favicon.png` },
    },
    mainEntityOfPage: `${SITE_URL}/tin-tuc/${post.slug}`,
    articleSection: post.category,
    keywords: post.tags.join(", "),
  };
  const breadcrumbJsonLd = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Trang chủ", item: SITE_URL },
      { "@type": "ListItem", position: 2, name: "Tin tức", item: `${SITE_URL}/tin-tuc` },
      {
        "@type": "ListItem",
        position: 3,
        name: post.title,
        item: `${SITE_URL}/tin-tuc/${post.slug}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <section className="pt-24 md:pt-28 pb-10 gradient-hero-bg">
        <div className="container-narrow max-w-6xl">
          <div className="grid gap-8 lg:grid-cols-[minmax(0,1fr)_420px] lg:items-end">
            <div>
              <nav className="flex flex-wrap items-center gap-2 text-xs font-semibold text-muted-foreground">
                <Link to="/" className="hover:text-primary">
                  Trang chủ
                </Link>
                <span>/</span>
                <Link to="/tin-tuc" className="hover:text-primary">
                  Tin tức
                </Link>
              </nav>

              <Link
                to="/tin-tuc"
                className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                <ArrowLeft className="h-4 w-4" />
                Tất cả bài viết
              </Link>

              <div className="mt-6 flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                <Link
                  to="/tin-tuc"
                  search={{ topic: post.category ?? undefined }}
                  className="rounded-full bg-card px-3 py-1 font-semibold text-primary shadow-sm transition hover:bg-primary hover:text-primary-foreground"
                >
                  {post.category ?? "KimThanh Kids"}
                </Link>
                <span className="inline-flex items-center gap-1.5">
                  <Calendar className="h-4 w-4" />
                  {formatDate(post.publishedAt)}
                </span>
              </div>

              <h1 className="mt-5 max-w-3xl font-display text-4xl font-bold leading-tight text-foreground sm:text-5xl">
                {post.title}
              </h1>
              {post.excerpt && (
                <p className="mt-5 max-w-2xl text-lg leading-8 text-muted-foreground">
                  {post.excerpt}
                </p>
              )}

              {post.tags.length > 0 && (
                <div className="mt-6 flex flex-wrap gap-2">
                  {post.tags.slice(0, 4).map((tag) => (
                    <Link
                      key={tag}
                      to="/tin-tuc"
                      search={{ topic: tag }}
                      className="inline-flex items-center gap-1 rounded-full bg-primary-soft px-3 py-1 text-xs font-semibold text-primary transition hover:bg-primary hover:text-primary-foreground"
                    >
                      <Tag className="h-3 w-3" />
                      {tag}
                    </Link>
                  ))}
                </div>
              )}
            </div>

            <img
              src={coverImageUrl}
              alt={post.title}
              className="hidden aspect-[4/3] w-full rounded-3xl object-cover shadow-card lg:block"
            />
          </div>
        </div>
      </section>

      <article className="py-10 md:py-14">
        <div className="container-narrow">
          <img
            src={coverImageUrl}
            alt={post.title}
            className="mx-auto aspect-[16/10] w-full max-w-3xl rounded-3xl object-cover shadow-card lg:hidden"
          />
          <Markdown markdown={post.contentMarkdown} />
        </div>
      </article>

      {related.length > 0 && (
        <section className="border-t border-border/70 bg-primary-soft/20 py-14 md:py-16">
          <div className="container-narrow">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-primary">
                  Gợi ý đọc tiếp
                </span>
                <h2 className="mt-2 font-display text-3xl font-bold text-foreground">
                  Bài viết liên quan
                </h2>
              </div>
              <Link
                to="/tin-tuc"
                className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
              >
                Xem tất cả <ArrowRight className="h-4 w-4" />
              </Link>
            </div>
            <div className="mt-6 grid gap-6 md:grid-cols-3">
              {related.map((item) => (
                <Link
                  key={item.slug}
                  to="/tin-tuc/$slug"
                  params={{ slug: item.slug }}
                  className="group overflow-hidden rounded-3xl border border-border bg-card shadow-card transition hover:-translate-y-1 hover:shadow-card-hover"
                >
                  <img
                    src={item.coverImageUrl ?? BLOG_PLACEHOLDER_IMAGE}
                    alt={item.title}
                    loading="lazy"
                    className="aspect-[16/10] w-full object-cover transition-transform duration-500 group-hover:scale-105"
                  />
                  <div className="p-5">
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Calendar className="h-3.5 w-3.5" />
                      {formatDate(item.publishedAt)}
                    </div>
                    <h3 className="mt-2 font-display text-lg font-bold text-foreground group-hover:text-primary">
                      {item.title}
                    </h3>
                    <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-primary">
                      Đọc tiếp <ArrowRight className="h-4 w-4" />
                    </span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </>
  );
}
