import { INestApplication } from "@nestjs/common";
import sharp from "sharp";
import request from "supertest";
import { TenantFixture, bootstrap, createTenant } from "./helpers";

describe("Phase 1 — media (compress + lưu nội bộ + cô lập)", () => {
  let app: INestApplication;
  const api = () => request(app.getHttpServer());
  const auth = (t: TenantFixture) => ({ Host: t.host, Authorization: `Bearer ${t.adminToken}` });

  beforeAll(async () => {
    app = await bootstrap();
  });
  afterAll(async () => app.close());

  // Ảnh PNG lớn (2000x2000) chưa nén
  async function bigPng(): Promise<Buffer> {
    return sharp({
      create: { width: 2000, height: 2000, channels: 3, background: { r: 240, g: 100, b: 80 } },
    })
      .png()
      .toBuffer();
  }

  it("upload ảnh lớn → nén nhỏ hơn nhiều (webp, ≤1280px) + serve được", async () => {
    const t = await createTenant(app);
    const src = await bigPng();

    const up = await api()
      .post("/api/media?kind=REPORT_PHOTO")
      .set(auth(t))
      .attach("file", src, { filename: "photo.png", contentType: "image/png" })
      .expect(201);

    expect(up.body.data.mimeType).toBe("image/webp");
    expect(up.body.data.sizeBytes).toBeLessThan(src.length); // đã nén
    expect(up.body.data.width).toBeLessThanOrEqual(1280); // đã resize
    expect(up.body.data.url).toContain("/api/media/");

    const serve = await api().get(up.body.data.url).set(auth(t)).expect(200);
    expect(serve.headers["content-type"]).toContain("image/webp");
    expect(serve.body.length).toBeGreaterThan(0);
  });

  it("từ chối file không phải ảnh", async () => {
    const t = await createTenant(app);
    const res = await api()
      .post("/api/media")
      .set(auth(t))
      .attach("file", Buffer.from("hello"), { filename: "a.txt", contentType: "text/plain" })
      .expect(400);
    expect(res.body.error.code).toBe("NOT_IMAGE");
  });

  it("cô lập: tenant B không tải được media của tenant A (404)", async () => {
    const A = await createTenant(app);
    const B = await createTenant(app);
    const up = await api()
      .post("/api/media")
      .set(auth(A))
      .attach("file", await bigPng(), { filename: "p.png", contentType: "image/png" })
      .expect(201);

    await api().get(up.body.data.url).set(auth(B)).expect(404);
  });
});
