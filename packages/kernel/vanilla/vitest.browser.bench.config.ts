import { playwright } from '@vitest/browser-playwright';
import { defineConfig, mergeConfig } from 'vitest/config';

import { benchmarkConfig } from './vitest.bench.config';

export default defineConfig(
  mergeConfig(
    benchmarkConfig('Vanilla 视图与同步出图性能（Chromium 源码，DPR 1）', [
      'benchmarks/dom/*.bench.ts',
      'benchmarks/integration/{mount,chain-update}.bench.ts',
    ]),
    {
      test: {
        browser: {
          enabled: true,
          headless: true,
          provider: playwright({ contextOptions: { deviceScaleFactor: 1 } }),
          instances: [{ browser: 'chromium' }],
        },
      },
    },
  ),
);
