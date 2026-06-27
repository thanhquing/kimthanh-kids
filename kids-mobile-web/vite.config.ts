import react from "@vitejs/plugin-react";
import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

const API_TARGET = process.env.VITE_API_TARGET ?? "http://localhost:3000";
const TENANT_HOST = process.env.VITE_TENANT_HOST ?? "demo.kimthanhkids.vn";

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: {
    port: 5176,
    host: true,
    allowedHosts: ["demo.kimthanhkids.vn", "localhost"],
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

