import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// KHÔNG ghim Host tenant nữa: tenant được chọn ở login và gửi qua header x-tenant
// (xem src/api/http.ts). Host về localhost → middleware không resolve tenant → x-tenant + JWT điều khiển.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5176,
    host: true,
    // pnpm hoist + dedup: file font @fontsource có realpath ngoài thư mục app → cho phép
    // monorepo root để Vite serve được (tránh 403 Forbidden trên /@fs).
    fs: { allow: [".."] },
    allowedHosts: ["demo.kimthanhkids.vn", "localhost"],
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});

