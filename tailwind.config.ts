import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{ts,tsx}",
    "./src/components/**/*.{ts,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        ink: "#12151B",
        paper: "#FAF9F6",
        // Theme-reactive tokens — resolve against the CSS variables set per
        // [data-theme] in globals.css, so utilities like `text-fg`,
        // `bg-surface/80`, `border-line` adapt to light/dark/ocean/sunset/forest.
        fg: "rgb(var(--fg-rgb) / <alpha-value>)",
        canvas: "rgb(var(--bg-rgb) / <alpha-value>)",
        surface: "rgb(var(--surface-rgb) / <alpha-value>)",
        surface2: "rgb(var(--surface-2-rgb) / <alpha-value>)",
        line: "var(--line)",
        brand: {
          50: "#EFF3FF",
          100: "#DCE5FF",
          400: "#5B7FFF",
          500: "#3D5DF7",
          600: "#2C46D9",
          700: "#2236AD",
          900: "#1A2A73",
        },
        accent: {
          400: "#FFC15E",
          500: "#F5A524",
          600: "#D6870F",
        },
      },
      fontFamily: {
        sans: ["var(--font-sans)", "system-ui", "sans-serif"],
        display: ["var(--font-display)", "system-ui", "sans-serif"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(18,21,27,0.04), 0 8px 24px -12px rgba(18,21,27,0.12)",
        soft: "0 1px 1px rgba(18,21,27,0.03), 0 2px 8px -2px rgba(18,21,27,0.06)",
        glow: "0 0 0 1px rgba(61,93,247,0.12), 0 12px 32px -8px rgba(61,93,247,0.35)",
        "glow-lg": "0 0 0 1px rgba(61,93,247,0.10), 0 24px 64px -16px rgba(61,93,247,0.4)",
      },
      backgroundImage: {
        "mesh-light":
          "radial-gradient(1000px 500px at 8% -10%, rgba(61,93,247,0.14) 0%, transparent 55%), radial-gradient(900px 480px at 96% 0%, rgba(245,165,36,0.12) 0%, transparent 55%), radial-gradient(1200px 700px at 50% 120%, rgba(91,127,255,0.10) 0%, transparent 60%)",
        "grid-faint":
          "linear-gradient(to right, rgba(18,21,27,0.045) 1px, transparent 1px), linear-gradient(to bottom, rgba(18,21,27,0.045) 1px, transparent 1px)",
        shimmer: "linear-gradient(110deg, transparent 35%, rgba(255,255,255,0.55) 50%, transparent 65%)",
      },
      keyframes: {
        float: {
          "0%, 100%": { transform: "translateY(0) translateX(0)" },
          "50%": { transform: "translateY(-16px) translateX(8px)" },
        },
        "float-slow": {
          "0%, 100%": { transform: "translateY(0) scale(1)" },
          "50%": { transform: "translateY(14px) scale(1.04)" },
        },
        "fade-in-up": {
          from: { opacity: "0", transform: "translateY(14px)" },
          to: { opacity: "1", transform: "translateY(0)" },
        },
        "fade-in": {
          from: { opacity: "0" },
          to: { opacity: "1" },
        },
        "scale-in": {
          from: { opacity: "0", transform: "scale(0.95)" },
          to: { opacity: "1", transform: "scale(1)" },
        },
        "gradient-x": {
          "0%, 100%": { backgroundPosition: "0% 50%" },
          "50%": { backgroundPosition: "100% 50%" },
        },
        shimmer: {
          from: { backgroundPosition: "-200% 0" },
          to: { backgroundPosition: "200% 0" },
        },
        "pulse-ring": {
          "0%": { boxShadow: "0 0 0 0 rgba(61,93,247,0.35)" },
          "70%": { boxShadow: "0 0 0 10px rgba(61,93,247,0)" },
          "100%": { boxShadow: "0 0 0 0 rgba(61,93,247,0)" },
        },
      },
      animation: {
        float: "float 9s ease-in-out infinite",
        "float-slow": "float-slow 13s ease-in-out infinite",
        "fade-in-up": "fade-in-up 0.6s cubic-bezier(0.16,1,0.3,1) both",
        "fade-in": "fade-in 0.5s ease-out both",
        "scale-in": "scale-in 0.4s cubic-bezier(0.16,1,0.3,1) both",
        "gradient-x": "gradient-x 6s ease infinite",
        shimmer: "shimmer 2.5s linear infinite",
        "pulse-ring": "pulse-ring 2.2s cubic-bezier(0.4,0,0.6,1) infinite",
      },
      transitionTimingFunction: {
        spring: "cubic-bezier(0.16, 1, 0.3, 1)",
      },
    },
  },
  plugins: [],
};
export default config;
