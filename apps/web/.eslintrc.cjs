const path = require("path");

module.exports = {
  root: true,
  extends: ["@kimthanh/eslint-config/next.js"],
  settings: {
    "import/resolver": {
      typescript: {
        alwaysTryTypes: true,
        project: path.join(__dirname, "tsconfig.json"),
      },
      node: true,
    },
  },
};
