import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../config/vite/dev-plugin';

export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  test: {
    environment: 'node',
    fsModuleCache: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
});
