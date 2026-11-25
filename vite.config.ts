import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'
import { fileURLToPath } from 'node:url'
import { firmsPlugin } from './scripts/firms-plugin'

// BASE_PATH is set by the GitHub Pages workflow to "/<repo-name>/".
// FIRM=<id> builds a deployment locked to clients/<id>.json (see README, "Per-firm config").
export default defineConfig({
  plugins: [react(), firmsPlugin({ dir: fileURLToPath(new URL('./clients', import.meta.url)), envFirm: process.env.FIRM })],
  base: process.env.BASE_PATH ?? '/',
  test: {
    coverage: {
      provider: 'v8',
      include: ['src/**/*.{ts,tsx}', 'scripts/**/*.ts'],
      exclude: ['**/*.test.{ts,tsx}', 'src/main.tsx', 'src/vite-env.d.ts'],
      reporter: ['text', 'html'],
      // Floors only go up. Raise them when coverage improves.
      thresholds: {
        // The simulation engine is pure logic and must stay fully tested.
        'src/sim/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        // Config validation, plan state and the build plugin are plain logic too.
        'src/config/firm.ts': { lines: 95, functions: 95, branches: 95, statements: 95 },
        'src/state/**': { lines: 95, functions: 95, branches: 90, statements: 95 },
        'scripts/**': { lines: 95, functions: 95, branches: 95, statements: 95 },
        // Whole app: just below today's level (the UI has no tests yet).
        lines: 35,
      },
    },
  },
})
