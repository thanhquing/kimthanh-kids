// @lovable.dev/vite-tanstack-config already includes the following — do NOT add them manually
// or the app will break with duplicate plugins:
//   - tanstackStart, viteReact, tailwindcss, tsConfigPaths, cloudflare (build-only),
//     componentTagger (dev-only), VITE_* env injection, @ path alias, React/TanStack dedupe,
//     error logger plugins, and sandbox detection (port/host/strictPort).
// You can pass additional config via defineConfig({ vite: { ... } }) if needed.
import { defineConfig } from "@lovable.dev/vite-tanstack-config";

// Redirect TanStack Start's bundled server entry to src/server.ts (our SSR error wrapper).
// @cloudflare/vite-plugin builds from this — wrangler.jsonc main alone is insufficient.
export default defineConfig({
  vite: {
    server: {
      proxy: {
        "/api": "http://127.0.0.1:3000",
      },
    },
  },
  tanstackStart: {
    server: { entry: "server" },
    // Prerender every route to static HTML at build time for max performance / SEO.
    // crawlLinks follows <Link> from "/" (via SiteHeader/SiteFooter nav) to discover all pages.
    prerender: {
      enabled: true,
      crawlLinks: true,
    },
  },
});
