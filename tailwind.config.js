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
      fontFamily: {
        sans: ["var(--font-jakarta)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        pop: "0 2px 4px rgba(14, 26, 51, 0.04), 0 16px 36px -18px rgba(14, 26, 51, 0.2)",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(.22,1.1,.3,1)",
        pop: "cubic-bezier(.2,.8,.2,1)",
      },
    },
  },
  darkMode: "class",
  plugins: [heroui({
    layout: {
      // Radios Pop: inputs 16, tarjetas 24; los botones son píldora (se fuerzan en cada Button)
      radius: { small: "12px", medium: "16px", large: "24px" },
      borderWidth: { small: "1px", medium: "2px", large: "3px" },
    },
    themes: {
      light: {
        colors: {
          background: "#f5f6fa",
          foreground: "#0e1a33",
          content1: "#ffffff",
          divider: "rgba(14, 26, 51, 0.07)",
          focus: "#2f9e8f",
          // primary = marino; secondary = marca; success/danger/warning = dinero
          primary: { 50: "#eef2fb", 100: "#dbe3f5", 200: "#b5c4e8", 300: "#8199d0", 400: "#4a63a5", 500: "#2a428a", 600: "#0b1f4d", 700: "#0b1f4d", 800: "#0a1a40", 900: "#0a1a40", DEFAULT: "#0b1f4d", foreground: "#ffffff" },
          secondary: { 50: "#ecf8f6", 100: "#d3efea", 200: "#a8dfd6", 300: "#78cabd", 400: "#4db5a6", 500: "#2f9e8f", 600: "#1f7a6e", 700: "#17695f", 800: "#115048", 900: "#0b3832", DEFAULT: "#2f9e8f", foreground: "#ffffff" },
          success: { 50: "#ecf8f6", 100: "#d3efea", 200: "#a8dfd6", 300: "#78cabd", 400: "#4db5a6", 500: "#1f8c7d", 600: "#17695f", 700: "#115048", 800: "#0b3832", 900: "#06221e", DEFAULT: "#1f8c7d", foreground: "#ffffff" },
          danger: { 50: "#fdeeed", 100: "#fad7d4", 200: "#f4aea9", 300: "#ec837c", 400: "#e2615a", 500: "#d9473f", 600: "#b3342d", 700: "#8c2822", 800: "#661d19", 900: "#40100e", DEFAULT: "#d9473f", foreground: "#ffffff" },
          warning: { 50: "#fdf6e4", 100: "#faebc2", 200: "#f5d98a", 300: "#efc556", 400: "#e3ab2a", 500: "#c98f12", 600: "#8a6008", 700: "#6e4c06", 800: "#523905", 900: "#362503", DEFAULT: "#c98f12", foreground: "#0e1a33" },
          default: {
            50: "#f5f6fa", 100: "#eef0f6", 200: "#e8ebf2", 300: "#c9cfdd", 400: "#8d95a8",
            500: "#6b7590", 600: "#4f5873", 700: "#37405a", 800: "#1f2a45", 900: "#0e1a33",
            DEFAULT: "#e8ebf2", foreground: "#0e1a33",
          },
        },
      },
      dark: {
        colors: {
          background: "#0a0c12",
          foreground: "#f1f3f8",
          content1: "#15181f",
          divider: "rgba(255, 255, 255, 0.06)",
          focus: "#d8f26a",
          // De noche la marca es lima; los textos de variante "flat" usan el tono 600
          primary: { 50: "#10131a", 100: "#1c2029", 200: "#262b36", 300: "#5b6b2e", 400: "#9db84a", 500: "#c3dd5a", 600: "#d8f26a", 700: "#d8f26a", 800: "#e4f68f", 900: "#eefab6", DEFAULT: "#d8f26a", foreground: "#0a0c12" },
          secondary: { 50: "#16131f", 100: "#241f33", 200: "#352e4d", 300: "#574b80", 400: "#8f80c4", 500: "#b0a2ee", 600: "#c7b8ff", 700: "#d6cbff", 800: "#e5deff", 900: "#f2eeff", DEFAULT: "#c7b8ff", foreground: "#0a0c12" },
          success: { 50: "#0b2a22", 100: "#12402f", 200: "#1b5f47", 300: "#2a8a68", 400: "#41b088", 500: "#5fd3a8", 600: "#5fd3a8", 700: "#8ae2c1", 800: "#b5eed8", 900: "#dcf7ec", DEFAULT: "#5fd3a8", foreground: "#0a0c12" },
          danger: { 50: "#34100e", 100: "#511a17", 200: "#7a2823", 300: "#a83a33", 400: "#d4524a", 500: "#ff6f66", 600: "#ff6f66", 700: "#ff948d", 800: "#ffb9b4", 900: "#ffdddb", DEFAULT: "#ff6f66", foreground: "#0a0c12" },
          warning: { 50: "#33260a", 100: "#4f3a0e", 200: "#765716", 300: "#a37a1f", 400: "#d4a42b", 500: "#ffd166", 600: "#ffd166", 700: "#ffdf8f", 800: "#ffebb8", 900: "#fff6dd", DEFAULT: "#ffd166", foreground: "#0a0c12" },
          default: {
            50: "#10131a", 100: "#1c2029", 200: "#262b36", 300: "#3a4150", 400: "#8d95a8",
            500: "#a3abbd", 600: "#bcc3d2", 700: "#d3d8e3", 800: "#e6e9f0", 900: "#f1f3f8",
            DEFAULT: "#262b36", foreground: "#f1f3f8",
          },
        },
      },
    },
  })],
};
