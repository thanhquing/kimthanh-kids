import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";

const BASE_URL = (import.meta.env.VITE_SITE_URL as string | undefined) || "https://kimthanhkids.vn";
const API_BASE = (import.meta.env.VITE_API_BASE_URL as string | undefined) || `${BASE_URL}/api`;

interface SitemapEntry {
  path: string;
  changefreq?: "weekly" | "monthly" | "daily";
  priority?: string;
  lastmod?: string;
}

type PublicPost = { slug: string; publishedAt?: string | null };

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

async function publicPostEntries(): Promise<SitemapEntry[]> {
  try {
    const res = await fetch(`${API_BASE}/public/posts?page=1&pageSize=50`);
    if (!res.ok) return [];
    const json = await res.json();
    const posts = (json?.data ?? []) as PublicPost[];
    return posts.map((post) => ({
      path: `/tin-tuc/${post.slug}`,
      changefreq: "monthly",
      priority: "0.6",
      lastmod: post.publishedAt ? new Date(post.publishedAt).toISOString().slice(0, 10) : undefined,
    }));
  } catch {
    return [];
  }
}

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const entries: SitemapEntry[] = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/tinh-nang", changefreq: "monthly", priority: "0.8" },
          { path: "/giai-phap", changefreq: "monthly", priority: "0.8" },
          { path: "/bang-gia", changefreq: "monthly", priority: "0.8" },
          { path: "/dang-ky", changefreq: "monthly", priority: "0.8" },
          { path: "/tin-tuc", changefreq: "weekly", priority: "0.7" },
          { path: "/lien-he", changefreq: "monthly", priority: "0.6" },
          ...(await publicPostEntries()),
        ];
        const urls = entries.map((e) =>
          [
            `  <url>`,
            `    <loc>${escapeXml(`${BASE_URL}${e.path}`)}</loc>`,
            e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            e.changefreq ? `    <changefreq>${e.changefreq}</changefreq>` : null,
            e.priority ? `    <priority>${e.priority}</priority>` : null,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );
        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");
        return new Response(xml, {
          headers: { "Content-Type": "application/xml", "Cache-Control": "public, max-age=3600" },
        });
      },
    },
  },
});
