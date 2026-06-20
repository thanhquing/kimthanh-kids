import { z } from "zod";

/** Validate & type-hoá biến môi trường. Fail-fast khi thiếu/sai cấu hình. */
export const configSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  API_PORT: z.coerce.number().int().positive().default(3000),
  API_GLOBAL_PREFIX: z.string().default("api"),
  API_CORS_ORIGINS: z.string().default("*"),

  DATABASE_URL: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(16),
  JWT_ACCESS_TTL: z.string().default("15m"),
  JWT_REFRESH_SECRET: z.string().min(16),
  JWT_REFRESH_TTL: z.string().default("30d"),

  ROOT_DOMAIN: z.string().default("kimthanhkids.vn"),
  PLATFORM_HOST: z.string().default("admin.kimthanhkids.vn"),
  API_HOST: z.string().default("api.kimthanhkids.vn"),
  TENANCY_MODE: z.enum(["POOL", "SILO"]).default("POOL"),
  FIXED_TENANT_ID: z.string().optional().default(""),

  PAST_DUE_GRACE_DAYS: z.coerce.number().int().nonnegative().default(7),
  SUSPENDED_GRACE_DAYS: z.coerce.number().int().nonnegative().default(14),

  VNPAY_TMN_CODE: z.string().optional().default(""),
  VNPAY_HASH_SECRET: z.string().optional().default(""),
  VNPAY_RETURN_URL: z.string().optional().default(""),
});

export type AppConfig = z.infer<typeof configSchema>;

export function validateEnv(raw: Record<string, unknown>): AppConfig {
  const parsed = configSchema.safeParse(raw);
  if (!parsed.success) {
    const issues = parsed.error.issues
      .map((i) => `  - ${i.path.join(".")}: ${i.message}`)
      .join("\n");
    throw new Error(`Cấu hình môi trường không hợp lệ:\n${issues}`);
  }
  return parsed.data;
}
