import { z } from "zod";

const DEFAULT_JWT_SECRETS = new Set([
  "dev-access-secret-change-me-min-32-chars",
  "dev-refresh-secret-change-me-min-32-chars",
]);

function looksLowEntropySecret(value: string): boolean {
  const trimmed = value.trim();
  if (DEFAULT_JWT_SECRETS.has(trimmed)) return true;
  if (/^(.)\1+$/.test(trimmed)) return true;
  if (/^(changeme|change-me|secret|password|jwt-secret|dev-secret)/i.test(trimmed)) return true;
  return false;
}

/** Validate & type-hoá biến môi trường. Fail-fast khi thiếu/sai cấu hình. */
export const configSchema = z
  .object({
    NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
    API_PORT: z.coerce.number().int().positive().default(3000),
    API_GLOBAL_PREFIX: z.string().default("api"),
    API_CORS_ORIGINS: z.string().default("*"),

    DATABASE_URL: z.string().url(),

    JWT_ACCESS_SECRET: z.string().min(32), // HS256: khuyến nghị ≥32 ký tự
    JWT_ACCESS_TTL: z.string().default("15m"),
    JWT_REFRESH_SECRET: z.string().min(32),
    JWT_REFRESH_TTL: z.string().default("30d"),
    // Refresh token đặt trong cookie HttpOnly. Secure mặc định theo NODE_ENV=production;
    // override "true"/"false" khi TLS kết thúc ở reverse proxy mà app nhận http.
    AUTH_COOKIE_SECURE: z.enum(["true", "false"]).optional(),

    ROOT_DOMAIN: z.string().default("kimthanhkids.vn"),
    PLATFORM_HOST: z.string().default("admin.kimthanhkids.vn"),
    API_HOST: z.string().default("api.kimthanhkids.vn"),
    TENANCY_MODE: z.enum(["POOL", "SILO"]).default("POOL"),
    FIXED_TENANT_ID: z.string().optional().default(""),

    // ─── Reverse proxy & rate limit ───
    // Số hop proxy tin cậy (X-Forwarded-For) → req.ip là IP client thật. 0 = tắt.
    TRUST_PROXY: z.coerce.number().int().nonnegative().default(1),
    // Rate limit chung cho mọi route (chống lạm dụng API).
    THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    THROTTLE_LIMIT: z.coerce.number().int().positive().default(120),
    // Rate limit riêng, chặt hơn cho /auth/login + /auth/refresh (chống brute-force).
    AUTH_THROTTLE_TTL_MS: z.coerce.number().int().positive().default(60_000),
    AUTH_THROTTLE_LIMIT: z.coerce.number().int().positive().default(5),

    // ─── Mật khẩu & account lockout ───
    BCRYPT_COST: z.coerce.number().int().min(10).max(15).default(12),
    // Số lần đăng nhập sai liên tiếp (theo tài khoản) trước khi khóa tạm.
    AUTH_LOCKOUT_THRESHOLD: z.coerce.number().int().positive().default(10),
    // Thời lượng khóa (phút) sau khi vượt ngưỡng.
    AUTH_LOCKOUT_MINUTES: z.coerce.number().int().positive().default(15),

    PAST_DUE_GRACE_DAYS: z.coerce.number().int().nonnegative().default(7),
    SUSPENDED_GRACE_DAYS: z.coerce.number().int().nonnegative().default(14),

    // VNPay là cấu hình NHẠY CẢM → KHÔNG default trong code. Deploy không dùng VNPay có thể
    // để trống; nếu bật/config VNPay ở prod thì superRefine bắt đủ secret + URL.
    VNPAY_TMN_CODE: z.string().optional(),
    VNPAY_HASH_SECRET: z.string().optional(),
    // URL cổng thanh toán (trang nhập thẻ). Không default trong code; chỉ bắt buộc khi gọi
    // flow VNPay hoặc ở production có cấu hình VNPay secret.
    VNPAY_PAY_URL: z.string().url().optional(),
    // URL app hiển thị kết quả sau thanh toán. Không default trong code; bắt buộc khi gọi VNPay.
    VNPAY_RETURN_URL: z.string().optional(),

    // ─── Media (lưu trữ nội bộ + nén) ───
    MEDIA_ROOT: z.string().default("storage"),
    MEDIA_MAX_DIM: z.coerce.number().int().positive().default(1280), // px cạnh dài nhất
    MEDIA_QUALITY: z.coerce.number().int().min(40).max(95).default(72), // webp quality (đủ cho PH xem)
  })
  .superRefine((cfg, ctx) => {
    if (cfg.NODE_ENV === "production") {
      for (const key of ["JWT_ACCESS_SECRET", "JWT_REFRESH_SECRET"] as const) {
        if (looksLowEntropySecret(cfg[key])) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: [key],
            message:
              "Production phải dùng JWT secret riêng, entropy cao; không dùng secret dev/mặc định",
          });
        }
      }
    }
    if (cfg.NODE_ENV === "production" && cfg.API_CORS_ORIGINS.trim() === "*") {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["API_CORS_ORIGINS"],
        message: "Không dùng wildcard CORS trong production khi API bật credentials",
      });
    }
    const usesVnpay =
      (cfg.VNPAY_TMN_CODE ?? "").trim() !== "" ||
      (cfg.VNPAY_HASH_SECRET ?? "").trim() !== "" ||
      (cfg.VNPAY_PAY_URL ?? "").trim() !== "" ||
      (cfg.VNPAY_RETURN_URL ?? "").trim() !== "";
    if (cfg.NODE_ENV === "production" && usesVnpay) {
      if ((cfg.VNPAY_HASH_SECRET ?? "").trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["VNPAY_HASH_SECRET"],
          message: "Production dùng VNPay phải cấu hình VNPAY_HASH_SECRET",
        });
      }
      if ((cfg.VNPAY_PAY_URL ?? "").trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["VNPAY_PAY_URL"],
          message: "Production dùng VNPay phải cấu hình VNPAY_PAY_URL",
        });
      }
      if ((cfg.VNPAY_RETURN_URL ?? "").trim() === "") {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["VNPAY_RETURN_URL"],
          message: "Production dùng VNPay phải cấu hình VNPAY_RETURN_URL",
        });
      }
    }
    // Prod KHÔNG được để cổng thanh toán trỏ sandbox → tránh vô tình đẩy giao dịch thật
    // sang môi trường thử nghiệm.
    if (cfg.NODE_ENV === "production" && /sandbox/i.test(cfg.VNPAY_PAY_URL ?? "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VNPAY_PAY_URL"],
        message: "Production phải cấu hình VNPAY_PAY_URL trỏ cổng VNPay thật (không dùng sandbox)",
      });
    }
    if (
      cfg.NODE_ENV === "production" &&
      (cfg.VNPAY_RETURN_URL ?? "").trim() !== "" &&
      !/^https:\/\//i.test(cfg.VNPAY_RETURN_URL ?? "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VNPAY_RETURN_URL"],
        message: "Production phải cấu hình VNPAY_RETURN_URL dùng HTTPS",
      });
    }
    if (
      cfg.NODE_ENV === "production" &&
      /(localhost|127\.0\.0\.1|0\.0\.0\.0|sandbox)/i.test(cfg.VNPAY_RETURN_URL ?? "")
    ) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["VNPAY_RETURN_URL"],
        message: "Production không được dùng VNPAY_RETURN_URL localhost/sandbox",
      });
    }
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
