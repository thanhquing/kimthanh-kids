import path from "node:path";
import { copyFile, mkdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const MARK = path.join(ROOT, "kids-landing/public/favicon.png");
const WORDMARK = path.join(ROOT, "kids-landing/src/assets/logo-kimthanh.png");
const BRAND_BG = "#fff8f3";

async function ensureDest(dest) {
  await mkdir(path.dirname(dest), { recursive: true });
}

async function logWrite(dest) {
  console.log(`wrote ${path.relative(ROOT, dest)}`);
}

export async function markTransparent(size, dest) {
  await ensureDest(dest);
  await sharp(MARK)
    .resize(size, size, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toFile(dest);
  await logWrite(dest);
}

export async function markOnBg(size, innerPct, dest, bg = BRAND_BG) {
  await ensureDest(dest);
  const inner = Math.round(size * innerPct);
  const mark = await sharp(MARK)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: bg,
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .flatten({ background: bg })
    .png()
    .toFile(dest);
  await logWrite(dest);
}

export async function markPaddedTransparent(size, innerPct, dest) {
  await ensureDest(dest);
  const inner = Math.round(size * innerPct);
  const mark = await sharp(MARK)
    .resize(inner, inner, {
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    })
    .png()
    .toBuffer();

  await sharp({
    create: {
      width: size,
      height: size,
      channels: 4,
      background: { r: 0, g: 0, b: 0, alpha: 0 },
    },
  })
    .composite([{ input: mark, gravity: "center" }])
    .png()
    .toFile(dest);
  await logWrite(dest);
}

async function copyWordmark(dest) {
  await ensureDest(dest);
  await copyFile(WORDMARK, dest);
  await logWrite(dest);
}

async function main() {
  const mobileWebPublic = path.join(ROOT, "kids-mobile-web/public");
  const crmPublic = path.join(ROOT, "kids-crm/public");
  const platformPublic = path.join(ROOT, "kids-platform/public");
  const nativeAssets = path.join(ROOT, "kids-mobile-native/assets");

  await markTransparent(48, path.join(mobileWebPublic, "favicon.png"));
  await markOnBg(180, 0.82, path.join(mobileWebPublic, "apple-touch-icon.png"));
  await markTransparent(192, path.join(mobileWebPublic, "pwa-192.png"));
  await markTransparent(512, path.join(mobileWebPublic, "pwa-512.png"));
  await markOnBg(512, 0.72, path.join(mobileWebPublic, "maskable-512.png"));
  await copyWordmark(path.join(mobileWebPublic, "logo-kimthanh.png"));

  for (const appPublic of [crmPublic, platformPublic]) {
    await markTransparent(48, path.join(appPublic, "favicon.png"));
    await markOnBg(180, 0.82, path.join(appPublic, "apple-touch-icon.png"));
  }

  await markTransparent(96, path.join(ROOT, "kids-crm/src/assets/logo-mark.png"));
  await markTransparent(96, path.join(ROOT, "kids-platform/src/assets/logo-mark.png"));
  await copyWordmark(path.join(ROOT, "kids-crm/src/assets/logo-kimthanh.png"));
  await copyWordmark(path.join(ROOT, "kids-platform/src/assets/logo-kimthanh.png"));

  await markOnBg(1024, 0.8, path.join(nativeAssets, "icon.png"));
  await markPaddedTransparent(1024, 0.66, path.join(nativeAssets, "adaptive-icon.png"));
  await markTransparent(48, path.join(nativeAssets, "favicon.png"));
  await markPaddedTransparent(1024, 0.55, path.join(nativeAssets, "splash.png"));

  console.log("Icon generation complete. Source mark is 180px, so large outputs are upscaled.");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
