import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';
import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';
import { resolveReconcilerBudget } from './benchmarks/_budgets';

// 当前原生构建入口有 schema 初始化错误；源码探索结果不可与原生 ESM 基线直接比较
const reconcilerEntry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  resolve: {
    alias: [{ find: /^@retikz\/reconciler$/, replacement: reconcilerEntry }],
  },
  test: {
    maxWorkers: 1,
    fileParallelism: false,
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'Reconciler 完整编译性能测试报告（源码加载探索，非原生 ESM）',
        artifact: 'vite-source',
        dimensionLabels: ['操作', '输入形态', '规模'],
        budgets: resolveReconcilerBudget,
        baselinePath: process.env.RETIKZ_RECONCILER_BENCH_BASELINE,
        runnerId: process.env.RETIKZ_RECONCILER_BENCH_RUNNER_ID,
        sourceDirectory: 'src',
        configFiles: ['vite.config.ts', 'vitest.bench.config.ts', '../../../config/vite/library-config.ts'],
      }),
    ],
    environment: 'node',
    include: [],
    benchmark: { include: ['benchmarks/**/*.bench.ts'], retainSamples: true },
    pool: 'threads',
  },
});
