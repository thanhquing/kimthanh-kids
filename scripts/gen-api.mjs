#!/usr/bin/env node
/**
 * Generate api-client CHUNG từ OpenAPI, rồi COPY vào từng app con.
 *
 * Vì sao copy (không alias): Metro/Expo rất khó import ra ngoài thư mục app.
 * Copy vào `src/api/generated/` giúp mỗi app TỰ CHỨA → build/deploy VPS + Expo
 * không cần cấu hình đặc biệt.
 *
 * Luồng:
 *   1) (tuỳ chọn) làm mới kids-api/openapi.json — bật bằng cờ --fresh
 *   2) sinh type vào api-client/generated/api.d.ts (openapi-typescript)
 *   3) copy file generated vào <app>/src/api/generated/ cho từng app có thư mục src/
 *
 * Dùng:  pnpm gen:api           (dùng openapi.json có sẵn)
 *        pnpm gen:api --fresh   (chạy lại export OpenAPI từ kids-api trước)
 */
import { execSync } from "node:child_process";
import { existsSync, mkdirSync, copyFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = dirname(fileURLToPath(import.meta.url)).replace(/\/scripts$/, "");
const OPENAPI = join(ROOT, "kids-api", "openapi.json");
const OUT_DIR = join(ROOT, "api-client", "generated");
const OUT_FILE = join(OUT_DIR, "api.d.ts");

// Các app sẽ nhận bản copy. Thêm/bớt ở đây khi có app mới.
const APPS = ["kids-platform", "kids-crm", "kids-mobile-native"];

const run = (cmd, cwd = ROOT) => execSync(cmd, { cwd, stdio: "inherit" });
const log = (m) => console.log(`\x1b[36m[gen:api]\x1b[0m ${m}`);

// 1) làm mới spec nếu --fresh
if (process.argv.includes("--fresh")) {
  log("Xuất lại OpenAPI từ kids-api…");
  run("pnpm openapi:json", join(ROOT, "kids-api"));
}
if (!existsSync(OPENAPI)) {
  console.error(`Thiếu ${OPENAPI}. Chạy: pnpm openapi  (hoặc pnpm gen:api --fresh)`);
  process.exit(1);
}

// 2) sinh type chung
mkdirSync(OUT_DIR, { recursive: true });
log("Sinh type từ OpenAPI → api-client/generated/api.d.ts");
run(`npx openapi-typescript "${OPENAPI}" -o "${OUT_FILE}"`);

// 3) copy vào từng app
let copied = 0;
for (const app of APPS) {
  const appSrc = join(ROOT, app, "src");
  if (!existsSync(appSrc)) {
    log(`bỏ qua ${app} (chưa scaffold src/)`);
    continue;
  }
  const dest = join(appSrc, "api", "generated");
  mkdirSync(dest, { recursive: true });
  copyFileSync(OUT_FILE, join(dest, "api.d.ts"));
  log(`copy → ${app}/src/api/generated/api.d.ts`);
  copied++;
}

log(`Xong. Copy vào ${copied}/${APPS.length} app.`);
log("Mỗi app dùng type qua lớp http.ts (xem README §api-client).");
