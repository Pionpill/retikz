import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';
import { resolveFoundationBudget } from './benchmarks/_budgets';

const foundationEntry = fileURLToPath(new URL('./dist/index.js', import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^@retikz\/foundation$/, replacement: foundationEntry }] },
  test: {
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'Foundation 单元性能测试报告',
        dimensionLabels: ['操作', '输入形态', '规模'],
        budgets: resolveFoundationBudget,
        baselinePath: process.env.RETIKZ_FOUNDATION_BENCH_BASELINE,
        runnerId: process.env.RETIKZ_FOUNDATION_BENCH_RUNNER_ID,
        sourceDirectory: 'src',
        configFiles: ['vite.config.ts', 'vitest.bench.config.ts', '../../../config/vite/library-config.ts'],
      }),
    ],
    environment: 'node',
    include: [],
    benchmark: { include: ['benchmarks/**/*.bench.ts'], retainSamples: true },
    server: { deps: { external: [/\/foundation\/dist\/index\.js$/] } },
    pool: 'threads',
  },
});
