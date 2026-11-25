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
      exclude: ['**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
      // Floors only go up. Raise them when coverage improves.
      thresholds: {
        // The simulation engine is pure logic and must stay fully tested.
        'src/sim/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        // Plan state and formatting are plain logic too.
        'src/format.ts': { lines: 95, functions: 95, branches: 95, statements: 95 },
        'src/state/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        // Whole app: just below today's level.
        // (Reset from 36 to 24 once in #20, owner-approved, when the per-firm config was removed.)
        lines: 89,
      },
    },
  },
})
