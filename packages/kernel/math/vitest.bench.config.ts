import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';

/** 基准只加载当前构建的公开入口，类型检查仍使用包的公开类型 */
const mathEntry = fileURLToPath(new URL('./dist/index.js', import.meta.url));

export default defineConfig({
  resolve: {
    alias: [{ find: /^@retikz\/math$/, replacement: mathEntry }],
  },
  test: {
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'Math 单元性能测试报告',
        budgets: {},
        baselinePath: process.env.RETIKZ_MATH_BENCH_BASELINE,
        runnerId: process.env.RETIKZ_MATH_BENCH_RUNNER_ID,
        sourceDirectory: 'src',
        configFiles: ['vite.config.ts', 'vitest.bench.config.ts', '../../../config/vite/library-config.ts'],
      }),
    ],
    environment: 'node',
    include: [],
    benchmark: {
      include: ['benchmarks/**/*.bench.ts'],
      retainSamples: true,
    },
    server: {
      deps: {
        // 入口及其传递依赖由 Node 原生 ESM 加载，不经过 Vite 的导出 getter 包装
        external: [/\/math\/dist\/index\.js$/],
      },
    },
    pool: 'threads',
  },
});
