import { fileURLToPath } from 'node:url'
import path from 'node:path'

const root = path.dirname(fileURLToPath(import.meta.url))

/** @type {import('tailwindcss').Config} */
export default {
  content: [path.join(root, 'index.html'), path.join(root, 'src/**/*.{ts,tsx}')],
  theme: {
    extend: {
      fontFamily: { sans: ['"Inter Variable"', 'Inter', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'] },
      boxShadow: {
        soft: '0 1px 2px rgb(15 23 42 / 0.04), 0 4px 14px -6px rgb(15 23 42 / 0.07)',
        pop: '0 10px 30px -10px rgb(124 58 237 / 0.45)',
      },
    },
  },
  plugins: [],
}
