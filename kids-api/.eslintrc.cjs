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
};
