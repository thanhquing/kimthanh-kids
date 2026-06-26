/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ["class"],
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Be Vietnam Pro"', "Inter", "system-ui", "sans-serif"],
      },
      colors: {
        // Bảng màu lấy NGUYÊN từ mock-ui/shared.css để khớp 100% với HTML design.
        primary: { DEFAULT: "#f26b5e", 600: "#e25548" },
        accent: "#f89a5b",
        success: "#7bc796",
        danger: "#ff7a7a",
        warning: "#ffd27a",
        sand: "#fff8f3",
        ink: "#3a1f1a",
        muted: "#8b6f68",
        // viền/nền phụ dùng trong shared.css
        line: { DEFAULT: "#f4e7e0", soft: "#f1e3dc", faint: "#fbf1eb" },
        // shadcn semantic (map sang token mock) — cho component shadcn thêm sau
        border: "#f4e7e0",
        input: "#f1e3dc",
        ring: "#f26b5e",
        background: "#fff8f3",
        foreground: "#3a1f1a",
      },
      borderRadius: {
        lg: "1rem", // card
        md: "0.85rem", // button
        sm: "0.75rem", // field
      },
      boxShadow: {
        card: "0 1px 3px rgba(58,31,26,.05), 0 1px 2px rgba(58,31,26,.04)",
        primary: "0 4px 14px -4px rgba(242,107,94,.45)",
      },
    },
  },
  plugins: [],
};
