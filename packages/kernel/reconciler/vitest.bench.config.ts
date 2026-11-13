import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';
import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';
import { resolveReconcilerBudget } from './benchmarks/_budgets';
import { formatReconcilerComparison } from './benchmarks/_report';

// 当前原生构建入口有 schema 初始化错误；源码探索结果不可与原生 ESM 基线直接比较
const reconcilerEntry = fileURLToPath(new URL('./src/index.ts', import.meta.url));

export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  resolve: {
    alias: [{ find: /^@retikz\/reconciler$/, replacement: reconcilerEntry }],
  },
  test: {
    maxWorkers: 3,
    fileParallelism: true,
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'Reconciler 全量、增量首屏与更新性能报告（源码加载，非原生 ESM）',
        artifact: 'vite-source',
        dimensionLabels: ['测量组', '元素域', '输入/变化', '规模', '策略'],
        appendix: formatReconcilerComparison,
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
