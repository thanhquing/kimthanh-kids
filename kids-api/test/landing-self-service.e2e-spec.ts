import { INestApplication } from "@nestjs/common";
import request from "supertest";
import { PrismaService } from "../src/prisma/prisma.service";
import { PLATFORM_HOST, bootstrap, genTaxCode, loginPlatform, rnd } from "./helpers";

describe("Landing self-service — public plans, paid signup, blog posts", () => {
  let app: INestApplication;
  let prisma: PrismaService;
  const api = () => request(app.getHttpServer());

  beforeAll(async () => {
    app = await bootstrap();
    prisma = app.get(PrismaService);
  });
  afterAll(async () => app.close());

  it("GET /public/plans chỉ trả gói public active và field an toàn", async () => {
    const res = await api().get("/api/public/plans").expect(200);
    const codes = res.body.data.map((p: { code: string }) => p.code);
    expect(codes).toContain("free");
    expect(codes).toContain("starter");
    expect(codes).not.toContain("dedicated");
    const starter = res.body.data.find((p: { code: string }) => p.code === "starter");
    expect(starter.prices.length).toBeGreaterThan(0);
    expect(starter.features.length).toBeGreaterThan(0);
    expect(starter.limits.length).toBeGreaterThan(0);
    expect(starter).not.toHaveProperty("tenantCount");
  });

  it("signup paid tạo tenant Free ACTIVE + invoice OPEN, mark-paid mới nâng gói", async () => {
    const slug = `paid-${rnd()}`;
    const res = await api()
      .post("/api/public/signup")
      .send({
        schoolName: `Trường ${slug}`,
        slug,
        taxCode: genTaxCode(),
        adminEmail: `admin@${slug}.vn`,
        adminPassword: "Password123",
        adminFullName: "HT",
        acceptConsent: true,
        planCode: "starter",
        billingCycle: "MONTHLY",
      })
      .expect(201);

    expect(res.body.data.subscription.status).toBe("ACTIVE");
    expect(res.body.data.selectedPlan.code).toBe("starter");
    expect(res.body.data.upgradeInvoice.status).toBe("OPEN");
    expect(res.body.data.publicInvoiceUrl).toContain("/hoa-don/");

    const tenant = await prisma.system.tenant.findUnique({
      where: { id: res.body.data.tenant.id },
      include: { subscription: { include: { plan: true } } },
    });
    expect(tenant!.subscription!.plan.code).toBe("free");
    expect(tenant!.planTier).toBe("FREE");

    await api()
      .get(`/api/public/platform-invoices/${res.body.data.upgradeInvoice.publicToken}`)
      .expect(200);

    const token = await loginPlatform(app);
    await api()
      .post(`/api/platform/invoices/${res.body.data.upgradeInvoice.id}/mark-paid`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${token}`)
      .send({})
      .expect(201);

    const upgraded = await prisma.system.tenant.findUnique({
      where: { id: res.body.data.tenant.id },
      include: { subscription: { include: { plan: true, changes: true } } },
    });
    expect(upgraded!.subscription!.plan.code).toBe("starter");
    expect(upgraded!.planTier).toBe("STARTER");
    expect(upgraded!.subscription!.changes.some((c) => c.type === "UPGRADE")).toBe(true);
  });

  it("platform posts CRUD/publish và public chỉ thấy bài published", async () => {
    const token = await loginPlatform(app);
    const slug = `post-${rnd()}`;
    const created = await api()
      .post("/api/platform/posts")
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${token}`)
      .send({
        slug,
        title: "Bài test landing",
        excerpt: "Excerpt test",
        contentMarkdown: "# Bài test landing\n\nNội dung test",
        coverImageUrl: "/public/assets/blog/blog-placeholder.webp",
        category: "Test",
        tags: ["Test"],
      })
      .expect(201);

    await api().get(`/api/public/posts/${slug}`).expect(404);

    await api()
      .post(`/api/platform/posts/${created.body.data.id}/publish`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);

    const pub = await api().get(`/api/public/posts/${slug}`).expect(200);
    expect(pub.body.data.title).toBe("Bài test landing");
    expect(pub.body.data.contentMarkdown).toContain("Nội dung test");
    expect(pub.body.data.coverImageUrl).toBe(
      "http://localhost:3000/api/public/assets/blog/blog-placeholder.webp",
    );

    await api()
      .get("/api/public/assets/blog/blog-placeholder.webp")
      .expect("Content-Type", /image\/webp/)
      .expect(200);

    await api()
      .post(`/api/platform/posts/${created.body.data.id}/unpublish`)
      .set("Host", PLATFORM_HOST)
      .set("Authorization", `Bearer ${token}`)
      .expect(201);
    await api().get(`/api/public/posts/${slug}`).expect(404);
  });
});
