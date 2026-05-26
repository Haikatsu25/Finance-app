const { heroui } = require("@heroui/react");

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
    "./node_modules/@heroui/theme/dist/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          50:  "#ecfdf5",
          100: "#d1fae5",
          200: "#a7f3d0",
          300: "#6ee7b7",
          400: "#34d399",
          500: "#10b981",
          600: "#059669",
          700: "#047857",
          800: "#065f46",
          900: "#064e3b",
        },
        neural: {
          50:  "#eef2ff",
          100: "#e0e7ff",
          300: "#a5b4fc",
          400: "#818cf8",
          500: "#6366f1",
          600: "#4f46e5",
          700: "#4338ca",
          800: "#3730a3",
        },
        cyan: {
          400: "#22d3ee",
          500: "#06b6d4",
          600: "#0891b2",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        mono: ["Roboto Mono", "ui-monospace", "monospace"],
      },
      animation: {
        "fade-in-up":    "fadeInUp 0.5s ease-out both",
        "fade-in-scale": "fadeInScale 0.4s ease-out both",
        "spin-slow":     "spin 12s linear infinite",
        "pulse-slow":    "pulse 3s ease-in-out infinite",
        "mesh-drift":    "meshDrift 18s ease-in-out infinite alternate",
      },
      backdropBlur: {
        xs: "2px",
      },
      boxShadow: {
        glass:      "0 8px 32px rgba(0, 0, 0, 0.08)",
        "glass-dark": "0 8px 32px rgba(0, 0, 0, 0.45)",
        glow:       "0 0 24px rgba(16, 185, 129, 0.35)",
        "glow-purple": "0 0 24px rgba(99, 102, 241, 0.35)",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    themes: {
      light: {
        colors: {
          primary: {
            DEFAULT: "#10b981",
            foreground: "#ffffff",
          },
          focus: "#10b981",
        },
      },
      dark: {
        colors: {
          primary: {
            DEFAULT: "#10b981",
            foreground: "#ffffff",
          },
          focus: "#10b981",
        },
      },
    },
  })],
};