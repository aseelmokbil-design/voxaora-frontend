import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        vox: {
          purple: "#8B5CF6",
          "purple-dark": "#6D28D9",
          blue: "#3B82F6",
          cyan: "#06B6D4",
          dark: "#0A0A0F",
          card: "#12121A",
          border: "#1E1E2E",
          muted: "#6B7280",
        },
      },
      fontFamily: {
        sans: ["Inter", "system-ui", "sans-serif"],
        arabic: ["Cairo", "Noto Sans Arabic", "sans-serif"],
      },
      backgroundImage: {
        "glow-purple": "radial-gradient(ellipse at center, rgba(139,92,246,0.15) 0%, transparent 70%)",
        "glow-cyan": "radial-gradient(ellipse at center, rgba(6,182,212,0.15) 0%, transparent 70%)",
      },
      animation: {
        "pulse-slow": "pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite",
        "spin-slow": "spin 8s linear infinite",
        "bounce-gentle": "bounce 2s infinite",
      },
    },
  },
  plugins: [],
};
export default config;
