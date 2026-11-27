import { defineConfig } from 'vitest/config';
import type { ViteUserConfig as UserConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';
import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';
import { resolveVanillaBudget } from './benchmarks/_budgets';
import { formatIntegrationPhases } from './benchmarks/_phase-report';
import { integrationTimingPlugin } from './benchmarks/_timing-plugin';

/** Node 与浏览器使用同一套源码指纹、采样与报告格式，但单独发现用例 */
export const benchmarkConfig = (title: string, include: Array<string>): UserConfig => ({
  plugins: [createRetikzDevPlugin(), integrationTimingPlugin()],
  test: {
    fileParallelism: false,
    maxWorkers: 1,
    include: [],
    benchmark: { include, retainSamples: true },
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title,
        artifact: 'vite-source',
        dimensionLabels: ['操作', '输入/变化', '规模'],
        budgets: resolveVanillaBudget,
        appendix: formatIntegrationPhases,
        sourceDirectory: 'src',
        sourceDependencies: ['../core/src', '../reconciler/src', '../render/src', '../foundation/src', '../math/src'],
        configFiles: [
          'vitest.bench.config.ts',
          'vitest.browser.bench.config.ts',
          'package.json',
          '../reconciler/benchmarks/reconcile/_workload.ts',
        ],
      }),
    ],
  },
});
export default defineConfig(
  benchmarkConfig('Vanilla 包内与 SSR 性能（Node 源码）', [
    'benchmarks/normalize/*.bench.ts',
    'benchmarks/runtime/*.bench.ts',
    'benchmarks/integration/*svg-string.bench.ts',
  ]),
);
