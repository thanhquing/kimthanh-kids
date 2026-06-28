import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// Dev: app gọi `/api/...` (same-origin) → proxy sang kids-api :3000.
// KHÔNG ghim Host tenant nữa: tenant được chọn ở login và gửi qua header x-tenant
// (xem src/api/http.ts). Host về localhost → middleware không resolve tenant → x-tenant + JWT điều khiển.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:3000";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5173,
    host: "127.0.0.1",
    // Cho phép truy cập qua domain thật ở local (cần /etc/hosts trỏ 127.0.0.1).
    allowedHosts: ["demo.kimthanhkids.vn", "app.kimthanhkids.vn", "localhost"],
    proxy: {
      "/api": {
        target: API_TARGET,
        changeOrigin: true,
      },
    },
  },
});
