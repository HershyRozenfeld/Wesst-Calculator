import type { Config } from 'tailwindcss';

export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        // Separation day colors
        'sep-onah-beinonit': '#dc2626',   // Red — Onah Beinonit (day 30, 31)
        'sep-haflaga': '#ea580c',          // Orange — Haflaga
        'sep-chodesh': '#2563eb',          // Blue — Yom HaChodesh
        'sep-kavua': '#7c3aed',            // Purple — Fixed veset
        'sep-sighting': '#16a34a',         // Green — Recorded sighting
        'sep-ask-rav': '#ca8a04',          // Yellow — "Ask Rabbi"
        // App theme
        'primary': '#1e3a5f',
        'primary-light': '#2d5a8e',
        'primary-dark': '#122740',
        'surface': '#f8fafc',
      },
    },
  },
  plugins: [],
} satisfies Config;
