import { defineConfig } from 'vitest/config'
import { fileURLToPath } from 'node:url'

// Only the pure modules are covered. Those are the ones whose breakage is
// silent: a wrong stage threshold or a wrong day boundary produces a village
// that looks completely plausible and is quietly lying about your life.
export default defineConfig({
  resolve: {
    alias: { '@': fileURLToPath(new URL('./', import.meta.url)) },
  },
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
  },
})
