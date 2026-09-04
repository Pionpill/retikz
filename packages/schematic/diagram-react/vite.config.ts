import react from '@vitejs/plugin-react';

import { defineRetikzLibraryConfig } from '../../../config/vite/library-config';

import pkg from './package.json' with { type: 'json' };

export default defineRetikzLibraryConfig({
  packageRoot: __dirname,
  manifest: pkg,
  entry: ['src/index.ts', 'src/flow/index.ts'],
  plugins: [react()],
  test: {
    environment: 'node',
    experimental: {
      fsModuleCache: true,
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
});
