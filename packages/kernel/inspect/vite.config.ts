import { defineRetikzLibraryConfig } from '../../../config/vite/library-config';

import pkg from './package.json' with { type: 'json' };

export default defineRetikzLibraryConfig({
  packageRoot: __dirname,
  manifest: pkg,
  entry: ['src/index.ts', 'src/render/index.ts', 'src/react/index.ts', 'src/vanilla/index.ts'],
  test: {
    environment: 'node',
    experimental: {
      fsModuleCache: true,
    },
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'forks',
  },
});
