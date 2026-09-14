import { defineRetikzLibraryConfig } from '../../../config/vite/library-config';
import pkg from './package.json' with { type: 'json' };

export default defineRetikzLibraryConfig({
  packageRoot: __dirname,
  manifest: pkg,
  entry: [
    'src/index.ts',
    'src/point/index.ts',
    'src/point/bubble/index.ts',
    'src/point/connected-scatter/index.ts',
    'src/point/ranged-dot/index.ts',
    'src/point/regression/index.ts',
    'src/point/scatter/index.ts',
    'src/point/strip/index.ts',
  ],
  test: {
    environment: 'node',
    fsModuleCache: true,
    include: ['tests/**/*.test.{ts,tsx}'],
    pool: 'threads',
  },
});
