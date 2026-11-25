import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/".
export default defineConfig({
  plugins: [react()],
  base: process.env.BASE_PATH ?? '/',
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}'],
      exclude: ['src/**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
      // Floors only go up. Raise them when coverage improves.
      thresholds: {
        // The simulation engine is pure logic and must stay fully tested.
        'src/sim/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        // Whole app: today's level (the UI has no tests yet).
        lines: 10,
      },
    },
  },
})
