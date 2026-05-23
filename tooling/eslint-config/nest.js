/** @type {import("eslint").Linter.Config} */
module.exports = {
  extends: ["./index.js"],
  env: { node: true, jest: true },
  rules: {
    "@typescript-eslint/explicit-function-return-type": "off",
    "@typescript-eslint/no-explicit-any": "warn",
  },
};
