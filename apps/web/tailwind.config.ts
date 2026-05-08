import type { Config } from 'tailwindcss';

export default {
  darkMode: 'class',
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        brand: {
          50: '#f4f3ff',
          100: '#ebe9fe',
          200: '#d9d6fe',
          300: '#bdb4fd',
          400: '#9b8afa',
          500: '#7c5cf6',
          600: '#6a44ec',
          700: '#5b34d4',
          800: '#4b2cab',
          900: '#3f298b',
        },
        ink: {
          50: '#f6f7fb',
          100: '#eceef6',
          200: '#d6dae8',
          300: '#b1b8cf',
          400: '#7e87a4',
          500: '#5a6483',
          600: '#434c69',
          700: '#343c54',
          800: '#212740',
          900: '#141832',
          950: '#0b0e22',
        },
      },
      fontFamily: {
        sans: ['var(--font-sarabun)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-jetbrains-mono)', 'ui-monospace', 'monospace'],
      },
      boxShadow: {
        card: '0 1px 2px rgba(20,24,50,0.04), 0 8px 24px -12px rgba(20,24,50,0.10)',
        pop: '0 12px 32px -12px rgba(91,52,212,0.30), 0 4px 12px rgba(20,24,50,0.06)',
      },
      borderRadius: {
        '2xl': '1rem',
        '3xl': '1.25rem',
      },
    },
  },
  plugins: [],
} satisfies Config;
