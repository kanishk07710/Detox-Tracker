import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Run tests sequentially within integration tests (they share a DB)
    // Unit tests can run in parallel (they're pure functions)
    globals: true,
    environment: 'node',
    // Test file discovery
    include: ['tests/**/*.test.ts'],
    // Sets required env vars before app code loads (env.ts exits if they are missing).
    setupFiles: ['./tests/setup.ts'],
    // No tests exist until Phase 3; without this, `vitest run` fails CI on an empty suite.
    passWithNoTests: true,
    // Timeout per test (in ms)
    testTimeout: 10000,
  },
});
