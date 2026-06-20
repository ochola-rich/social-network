// Configuration for the Editorial Pulse Design System
// Maps the exact color palette, typography, and spacing from the UI/UX spec.
import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: "#97001b",
        "primary-container": "#c0152a",
        "on-primary": "#ffffff",
        background: "#f9f9f9",
        surface: "#f9f9f9",
        "surface-container-lowest": "#ffffff",
        "surface-container-low": "#f3f3f3",
        "on-surface": "#1a1c1c",
        "on-surface-variant": "#5b403e",
        "outline-variant": "#e4bdbb",
        outline: "#906f6d",
      },
      fontFamily: {
        sans: ["Lexend", "sans-serif"],
      },
      borderRadius: {
        sm: "0.125rem",
        DEFAULT: "0.25rem",
        md: "0.375rem",
        lg: "0.5rem",
        xl: "0.75rem",
        full: "9999px",
      },
      boxShadow: {
        editorial: "0 4px 20px -2px rgba(0, 0, 0, 0.05)",
        pulse: "0px 0px 12px rgba(192, 21, 42, 0.1)",
      },
    },
  },
  plugins: [],
};
export default config;
