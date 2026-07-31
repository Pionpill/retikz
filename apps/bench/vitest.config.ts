import path from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src/playground'),
    },
  },
  test: {
    environment: 'node',
    experimental: {
      fsModuleCache: true,
    },
    include: ['tests/**/*.test.ts'],
    pool: 'threads',
  },
});
