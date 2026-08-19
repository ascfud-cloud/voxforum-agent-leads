import type { Config } from 'tailwindcss'

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#14171a',
        paper: '#fafaf9',
        accent: '#2563eb',
        warn: '#d97706',
        crit: '#dc2626',
        ok: '#16a34a',
      },
    },
  },
  plugins: [],
}
export default config
