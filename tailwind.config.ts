import type { Config } from "tailwindcss";

export default {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        background: "var(--background)",
        foreground: "var(--foreground)",
        'imperial-black': "var(--imperial-black)",
        'imperial-gray': "var(--imperial-gray)",
        'imperial-red': "var(--imperial-red)",
        'imperial-white': "var(--imperial-white)",
        'empire-gold': "var(--empire-gold)",
      },
    },
  },
  plugins: [],
} satisfies Config;
