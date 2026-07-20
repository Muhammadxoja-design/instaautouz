/** @type {import('tailwindcss').Config} */
export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        display: ['"Bricolage Grotesque"', "system-ui", "sans-serif"],
        mono: ["ui-monospace", "SFMono-Regular", "Menlo", "Monaco", "Consolas", "Liberation Mono", "Courier New", "monospace"],
      },
      colors: {
        primary: {
          DEFAULT: "#1c4bff",
          50: "rgba(28, 75, 255, 0.05)",
          100: "rgba(28, 75, 255, 0.1)",
          200: "rgba(28, 75, 255, 0.2)",
          300: "rgba(28, 75, 255, 0.3)",
          400: "rgba(28, 75, 255, 0.4)",
          500: "#1c4bff",
          600: "#1640e0",
        },
        base: {
          50: "#f7f7f9",
          100: "#e9e9ed",
          200: "#d4d4db",
          300: "#afafbc",
          400: "#6b6b80",
          500: "#525266",
          600: "#3a3a4a",
          700: "#252533",
          800: "#16161f",
          900: "#0a0a0f",
        },
      },
      maxWidth: {
        content: "1152px",
      },
      spacing: {
        "18": "4.5rem",
        "22": "5.5rem",
        "30": "7.5rem",
      },
      boxShadow: {
        "primary-glow": "0 4px 24px rgba(28, 75, 255, 0.35)",
        "primary-glow-lg": "0 4px 32px rgba(28, 75, 255, 0.4)",
        "card": "0 1px 3px rgba(0, 0, 0, 0.04), 0 1px 2px rgba(0, 0, 0, 0.03)",
        "mockup": "0 25px 50px -12px rgba(0, 0, 0, 0.25)",
      },
    },
  },
  plugins: [],
};
