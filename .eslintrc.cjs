/** Root ESLint config — apps/packages extend their own. */
module.exports = {
  root: true,
  extends: ["@kimthanh/eslint-config"],
  ignorePatterns: ["**/dist/**", "**/.next/**", "**/build/**", "**/node_modules/**"],
};
