import { validateEnv } from "../src/config/config.schema";

const strongSecret = "prod-secret-2026-KimThanh-Kids-rotate-me-with-64-chars";

function baseEnv(overrides: Record<string, string> = {}) {
  return {
    NODE_ENV: "production",
    API_CORS_ORIGINS: "https://demo.kimthanhkids.vn",
    DATABASE_URL: "postgresql://kids:kids@localhost:5432/kids_api?schema=public",
    JWT_ACCESS_SECRET: strongSecret,
    JWT_REFRESH_SECRET: `${strongSecret}-refresh`,
    ...overrides,
  };
}

describe("Config schema production guards", () => {
  it("rejects default dev JWT secrets in production", () => {
    expect(() =>
      validateEnv(
        baseEnv({
          JWT_ACCESS_SECRET: "dev-access-secret-change-me-min-32-chars",
          JWT_REFRESH_SECRET: "dev-refresh-secret-change-me-min-32-chars",
        }),
      ),
    ).toThrow(/JWT_ACCESS_SECRET/);
  });

  it("rejects insecure VNPAY_RETURN_URL in production", () => {
    expect(() =>
      validateEnv(
        baseEnv({
          VNPAY_TMN_CODE: "REALTMN",
          VNPAY_HASH_SECRET: "real-vnpay-secret",
          VNPAY_PAY_URL: "https://pay.vnpay.vn/paymentv2/vpcpay.html",
          VNPAY_RETURN_URL: "http://localhost:5173/payment-result",
        }),
      ),
    ).toThrow(/VNPAY_RETURN_URL/);
  });

  it("accepts strong production secrets and HTTPS VNPay URLs", () => {
    expect(
      validateEnv(
        baseEnv({
          VNPAY_TMN_CODE: "REALTMN",
          VNPAY_HASH_SECRET: "real-vnpay-secret",
          VNPAY_PAY_URL: "https://pay.vnpay.vn/paymentv2/vpcpay.html",
          VNPAY_RETURN_URL: "https://demo.kimthanhkids.vn/payment-result",
        }),
      ).NODE_ENV,
    ).toBe("production");
  });
});
