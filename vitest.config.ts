import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    pool: 'forks',
    include: ['src/**/*.test.ts'],
    globals: false,
    coverage: {
      provider: 'v8',
      reporter: ['text', 'lcov', 'html'],
      thresholds: {
        lines: 60,
        functions: 60,
        branches: 50,
        statements: 60,
      },
      exclude: ['src/**/*.test.ts', 'src/renderer/**', 'src/preload/**', 'src/main/database/schema.sql'],
    },
  },
});