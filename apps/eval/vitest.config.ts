import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    fsModuleCache: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
});
