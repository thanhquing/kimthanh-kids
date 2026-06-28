/** @type {import('tailwindcss').Config} */
module.exports = {
  // "media" = follows system dark/light; app is light-only (app.config.ts userInterfaceStyle: "light")
  // "class" strategy is web-only and breaks on native — do not use.
  darkMode: "media",
  content: ["./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      fontFamily: {
        // font-sans = BeVietnamPro regular; weight variants are handled via
        // @layer utilities overrides in global.css (font-bold → BeVietnamPro_700Bold etc.)
        sans: ["BeVietnamPro_400Regular"]
      },
      colors: {
        primary: { DEFAULT: "#f26b5e", 600: "#e25548" },
        accent: "#f89a5b",
        success: "#7bc796",
        danger: "#ff7a7a",
        warning: "#ffd27a",
        sand: "#fff8f3",
        ink: "#3a1f1a",
        muted: "#8b6f68",
        line: { DEFAULT: "#f4e7e0", soft: "#f1e3dc", faint: "#fbf1eb" },
        border: "#f4e7e0",
        input: "#f1e3dc",
        ring: "#f26b5e",
        background: "#fff8f3",
        foreground: "#3a1f1a"
      },
      borderRadius: {
        lg: "16px",
        md: "14px",
        sm: "12px"
      }
    }
  },
  plugins: []
};
