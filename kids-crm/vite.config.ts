import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// Dev: app gọi `/api/...` (same-origin) → proxy sang kids-api :3000,
// và SET Host = TENANT_HOST để middleware tenant-resolution nhận diện trường.
// Nhờ vậy KHÔNG cần /etc/hosts và KHÔNG vướng CORS khi dev.
const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:3000";
const TENANT_HOST = process.env.VITE_TENANT_HOST ?? "demo.kimthanhkids.vn";

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
        configure: (proxy) => {
          proxy.on("proxyReq", (proxyReq) => {
            proxyReq.setHeader("host", TENANT_HOST);
          });
        },
      },
    },
  },
});
