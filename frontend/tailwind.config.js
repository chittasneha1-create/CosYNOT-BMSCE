/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#070b14",
          900: "#0b1220",
          800: "#111a2e",
          700: "#18233b",
        },
        violetx: {
          300: "#c4b5fd",
          400: "#a78bfa",
          500: "#8b5cf6",
          600: "#7c3aed",
        },
        safe: "#34d399",
        warn: "#fbbf24",
        high: "#fb923c",
        crit: "#f43f5e",
        flood: "#38bdf8",
      },
      fontFamily: {
        sans: ["IBM Plex Sans", "system-ui", "sans-serif"],
        display: ["IBM Plex Sans", "system-ui", "sans-serif"],
        mono: ["IBM Plex Mono", "ui-monospace", "monospace"],
      },
      boxShadow: {
        glass: "0 0 0 1px rgba(167,139,250,0.12), 0 12px 40px rgba(0,0,0,0.35)",
      },
    },
  },
  plugins: [],
};
