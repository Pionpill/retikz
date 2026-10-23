import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';

const coreEntry = fileURLToPath(new URL('./dist/index.js', import.meta.url));

export default defineConfig({
  resolve: { alias: [{ find: /^@retikz\/core$/, replacement: coreEntry }] },
  test: {
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'Core 编译性能测试报告',
        dimensionLabels: ['操作', '输入形态', '规模'],
        budgets: {},
        baselinePath: process.env.RETIKZ_CORE_BENCH_BASELINE,
        runnerId: process.env.RETIKZ_CORE_BENCH_RUNNER_ID,
        sourceDirectory: 'src',
        configFiles: ['vite.config.ts', 'vitest.bench.config.ts', '../../../config/vite/library-config.ts'],
      }),
    ],
    environment: 'node',
    include: [],
    benchmark: { include: ['benchmarks/**/*.bench.ts'], retainSamples: true },
    server: { deps: { external: [/\/core\/dist\/index\.js$/] } },
    pool: 'threads',
  },
});
