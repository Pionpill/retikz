import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    experimental: {
      fsModuleCache: true,
    },
    include: ['tests/**/*.test.ts'],
    pool: 'threads',
  },
});
