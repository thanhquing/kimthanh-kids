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
      adminEmail: email,
      adminPassword: password,
      adminFullName: "HT",
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
