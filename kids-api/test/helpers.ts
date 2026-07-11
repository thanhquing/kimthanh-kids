import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "../src/app.module";

export const ROOT = "kimthanhkids.vn";
export const PLATFORM_HOST = "admin.kimthanhkids.vn";

export async function bootstrap(): Promise<INestApplication> {
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
  const app = moduleRef.createNestApplication();
  app.setGlobalPrefix("api");
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  await app.init();
  return app;
}

export function rnd(): string {
  return Math.random().toString(36).slice(2, 8);
}

/** Sinh MST 10 số hợp lệ (đúng checksum Tổng cục Thuế) — ngẫu nhiên để không trùng giữa các test. */
export function genTaxCode(): string {
  const w = [31, 29, 23, 19, 17, 13, 7, 5, 3];
  const first9 = Array.from({ length: 9 }, (_, i) =>
    i === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10),
  );
  const sum = first9.reduce((s, d, i) => s + d * w[i], 0);
  const check = (10 - (sum % 11)) % 10;
  return first9.join("") + check;
}

export interface TenantFixture {
  slug: string;
  host: string;
  email: string;
  password: string;
  adminToken: string;
}

/** Tạo tenant mới + đăng nhập admin. Trả về fixture kèm token. */
export async function createTenant(app: INestApplication): Promise<TenantFixture> {
  const slug = `t-${rnd()}`;
  const email = `admin@${slug}.vn`;
  const password = "Password123";
  const host = `${slug}.${ROOT}`;

  await request(app.getHttpServer())
    .post("/api/public/signup")
    .send({
      schoolName: `Trường ${slug}`,
      slug,
      taxCode: genTaxCode(),
      adminEmail: email,
      adminPassword: password,
      adminFullName: "HT",
      acceptConsent: true,
    })
    .expect(201);

  const res = await request(app.getHttpServer())
    .post("/api/auth/login")
    .set("Host", host)
    .send({ email, password })
    .expect(201);

  return { slug, host, email, password, adminToken: res.body.data.accessToken };
}

export async function loginPlatform(app: INestApplication): Promise<string> {
  const res = await request(app.getHttpServer())
    .post("/api/auth/login")
    .set("Host", PLATFORM_HOST)
    .send({ email: "admin@kimthanhkids.vn", password: "Admin@12345" })
    .expect(201);
  return res.body.data.accessToken;
}
