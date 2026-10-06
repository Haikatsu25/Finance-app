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
        sans: ["var(--font-archivo)", "system-ui", "sans-serif"],
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
    layout: {
      // Radios por jerarquía: controles chicos, paneles medianos, losas grandes
      radius: { small: "4px", medium: "8px", large: "12px" },
      borderWidth: { small: "1px", medium: "2px", large: "3px" },
    },
    themes: {
      light: {
        colors: {
          background: "#eceee7",
          foreground: "#1f1a24",
          content1: "#f7f8f4",
          divider: "rgba(31, 26, 36, 0.12)",
          focus: "#1f1a24",
          // Sin color de marca: el primario es la tinta. El color queda para el dinero.
          primary:   { DEFAULT: "#1f1a24", foreground: "#eceee7" },
          secondary: { DEFAULT: "#5a5560", foreground: "#ffffff" },
          success:   { DEFAULT: "#059669", foreground: "#1f1a24" },
          danger:    { DEFAULT: "#e11d48", foreground: "#ffffff" },
          warning:   { DEFAULT: "#d97706", foreground: "#1f1a24" },
          default: {
            50: "#f4f5ef", 100: "#e9ebe3", 200: "#d8dbd0", 300: "#a5a1ab", 400: "#665f70",
            500: "#5a5560", 600: "#4a4552", 700: "#38343f", 800: "#2a262f", 900: "#1f1a24",
            DEFAULT: "#d8dbd0", foreground: "#1f1a24",
          },
        },
      },
      dark: {
        colors: {
          background: "#16131a",
          foreground: "#eceee7",
          content1: "#201c27",
          divider: "rgba(236, 238, 231, 0.12)",
          focus: "#eceee7",
          primary:   { DEFAULT: "#eceee7", foreground: "#16131a" },
          secondary: { DEFAULT: "#a29dab", foreground: "#16131a" },
          success:   { DEFAULT: "#059669", foreground: "#16131a" },
          danger:    { DEFAULT: "#e11d48", foreground: "#ffffff" },
          warning:   { DEFAULT: "#d97706", foreground: "#16131a" },
          default: {
            50: "#1b1721", 100: "#26212e", 200: "#342f3d", 300: "#5a5565", 400: "#a29dab",
            500: "#b4b0bc", 600: "#c8c5cf", 700: "#dad8df", 800: "#e8e7ec", 900: "#f4f4f1",
            DEFAULT: "#342f3d", foreground: "#eceee7",
          },
        },
      },
    },
  })],
};
