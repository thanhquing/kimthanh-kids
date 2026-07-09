/* eslint-env node */
module.exports = {
  parser: "@typescript-eslint/parser",
  parserOptions: { sourceType: "module" },
  plugins: ["@typescript-eslint/eslint-plugin", "prettier"],
  extends: ["plugin:@typescript-eslint/recommended", "prettier", "plugin:prettier/recommended"],
  root: true,
  env: { node: true, jest: true },
  ignorePatterns: [".eslintrc.cjs", "dist", "node_modules"],
  rules: {
    "@typescript-eslint/interface-name-prefix": "off",
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/explicit-module-boundary-types": "off",
    "@typescript-eslint/no-explicit-any": "warn",
    "@typescript-eslint/no-unused-vars": ["warn", { argsIgnorePattern: "^_" }],
    // Chặn raw query trong domain code (chống rò rỉ cross-tenant — xem plan)
    "no-restricted-syntax": [
      "error",
      {
        selector:
          "MemberExpression[property.name=/^\\$queryRaw|\\$executeRaw|\\$queryRawUnsafe|\\$executeRawUnsafe$/]",
        message:
          "Raw query bỏ qua tenant-extension → rủi ro rò rỉ cross-tenant. Dùng Prisma API hoặc bind tenantId tường minh trong allowlist.",
      },
    ],
  },
  overrides: [
    {
      // Guard: các module domain nhạy cảm về dữ liệu trẻ/phụ huynh PHẢI chạy qua `prisma.db`
      // (extension tự lọc tenantId). Cấm `prisma.system` (bỏ qua auto-filter → foot-gun rò tenant).
      // Nếu thật sự cần system-access ở đây, phải review + gỡ file khỏi glob này một cách tường minh.
      files: [
        "src/students/**/*.ts",
        "src/classrooms/**/*.ts",
        "src/health/**/*.ts",
        "src/medicine/**/*.ts",
        "src/incidents/**/*.ts",
        "src/attendance/**/*.ts",
        "src/announcements/**/*.ts",
        "src/menus/**/*.ts",
        "src/albums/**/*.ts",
        "src/lesson-plans/**/*.ts",
        "src/leave/**/*.ts",
        "src/notifications/**/*.ts",
      ],
      excludedFiles: ["**/*.spec.ts", "**/*.e2e-spec.ts"],
      rules: {
        "no-restricted-syntax": [
          "error",
          {
            selector:
              "MemberExpression[property.name=/^\\$queryRaw|\\$executeRaw|\\$queryRawUnsafe|\\$executeRawUnsafe$/]",
            message:
              "Raw query bỏ qua tenant-extension → rủi ro rò rỉ cross-tenant. Dùng Prisma API hoặc bind tenantId tường minh trong allowlist.",
          },
          {
            selector: "MemberExpression[object.property.name='prisma'][property.name='system']",
            message:
              "Module domain nhạy cảm phải dùng `prisma.db` (auto-filter tenantId). `prisma.system` bỏ qua auto-filter → rủi ro rò cross-tenant; nếu thực sự cần, review kỹ và gỡ file khỏi guard trong .eslintrc.cjs.",
          },
        ],
      },
    },
  ],
};
