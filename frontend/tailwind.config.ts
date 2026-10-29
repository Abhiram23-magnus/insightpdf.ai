import type { Config } from "tailwindcss";

// All colors come from CSS variables in globals.css, so light and dark
// themes are one class switch on <html>. Change a token there, not here.
// tok() wraps a variable so opacity shortcuts like `bg-cite/70` still work.
const tok = (name: string) =>
  `color-mix(in srgb, var(--${name}) calc(<alpha-value> * 100%), transparent)`;

const config: Config = {
  darkMode: "class",
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: ["var(--font-geist-sans)", "system-ui", "sans-serif"],
        mono: ["var(--font-geist-mono)", "ui-monospace", "monospace"],
      },
      colors: {
        bg: tok("bg"),
        surface: tok("surface"),
        "surface-2": tok("surface-2"),
        line: tok("border"),
        "line-strong": tok("border-strong"),
        ink: tok("text"),
        muted: tok("text-2"),
        faint: tok("text-3"),
        brand: tok("brand"),
        "brand-solid": tok("brand-solid"),
        "brand-soft": tok("brand-soft"),
        "brand-text": tok("brand-text"),
        violet: tok("violet"),
        cite: tok("cite"),
        "cite-soft": tok("cite-soft"),
        success: tok("success"),
        "success-soft": tok("success-soft"),
        danger: tok("danger"),
        "danger-soft": tok("danger-soft"),
        bubble: tok("bubble"),
      },
      borderRadius: {
        DEFAULT: "8px",
      },
      keyframes: {
        blink: { "50%": { opacity: "0" } },
        shimmer: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(100%)" },
        },
        indeterminate: {
          from: { transform: "translateX(-100%)" },
          to: { transform: "translateX(250%)" },
        },
        breathe: { "0%,100%": { opacity: "0.35" }, "50%": { opacity: "1" } },
      },
      animation: {
        blink: "blink 1s step-end infinite",
        shimmer: "shimmer 1.6s linear infinite",
        indeterminate: "indeterminate 1.4s ease-in-out infinite",
        breathe: "breathe 1.4s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
