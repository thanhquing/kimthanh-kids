const { colors } = require('@kimthanh/shared-ui/tokens');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './App.tsx',
    './src/**/*.{ts,tsx}',
    '../../packages/shared-ui/src/native/**/*.{ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: { brand: colors.brand, neutral: colors.neutral },
    },
  },
  plugins: [],
};
