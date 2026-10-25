import type { Config } from "tailwindcss";

const config: Config = {
  darkMode: "class",
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
      },
      animation: {
        'blob-slow': 'blob 22s infinite ease-in-out',
        'blob-reverse': 'blob-reverse 26s infinite ease-in-out',
        'pulse-subtle': 'pulse 4s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      keyframes: {
        blob: {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(30px, -45px) scale(1.08)' },
          '66%': { transform: 'translate(-25px, 20px) scale(0.95)' },
        },
        'blob-reverse': {
          '0%, 100%': { transform: 'translate(0px, 0px) scale(1)' },
          '33%': { transform: 'translate(-35px, 35px) scale(1.05)' },
          '66%': { transform: 'translate(25px, -30px) scale(0.96)' },
        },
      },
    },
  },
  plugins: [],
};
export default config;
