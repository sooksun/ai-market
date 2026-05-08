import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f0f5fa',
          100: '#dbe7f3',
          500: '#1e4a7a',
          600: '#173b62',
          700: '#102b48',
        },
        status: {
          draft: '#6b7280',
          submitted: '#2563eb',
          reviewing: '#d97706',
          returned: '#dc2626',
          approved: '#16a34a',
        },
        risk: {
          low: '#16a34a',
          medium: '#d97706',
          high: '#dc2626',
        },
      },
      fontFamily: {
        sans: ['"IBM Plex Sans Thai"', 'Sarabun', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
    },
  },
  plugins: [],
} satisfies Config;
