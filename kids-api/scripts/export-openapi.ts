/**
 * Xuất OpenAPI spec ra `kids-api/openapi.json` — KHÔNG cần chạy server.
 * Là nguồn type dùng chung: các app FE chạy codegen từ file này.
 * Dùng: `pnpm openapi:json` (xem package.json).
 */
import { NestFactory } from "@nestjs/core";
import { DocumentBuilder, SwaggerModule } from "@nestjs/swagger";
import { writeFileSync } from "node:fs";
import { join } from "node:path";
import { AppModule } from "../src/app.module";

async function main() {
  // Không lắng nghe cổng; chỉ dựng module graph để build spec.
  const app = await NestFactory.create(AppModule, { logger: false });
  app.setGlobalPrefix(process.env.API_GLOBAL_PREFIX ?? "api");

  const config = new DocumentBuilder()
    .setTitle("KimThanh Kids API")
    .setDescription("Multi-tenant SaaS backend: platform billing + preschool domain API A-G")
    .setVersion("0.1.0")
    .addBearerAuth()
    .build();

  const doc = SwaggerModule.createDocument(app, config);
  const out = join(__dirname, "..", "openapi.json");
  writeFileSync(out, JSON.stringify(doc, null, 2) + "\n");
  await app.close();

  const paths = Object.keys(doc.paths ?? {}).length;
  // eslint-disable-next-line no-console
  console.log(`OpenAPI đã ghi: ${out} (${paths} paths)`);
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
