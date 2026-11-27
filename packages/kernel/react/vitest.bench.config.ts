import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';
import { BenchmarkReporter } from '../../../scripts/benchmarks/reporter';

export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  test: {
    environment: 'node',
    fileParallelism: false,
    include: [],
    benchmark: { include: ['benchmarks/**/*.bench.ts'], retainSamples: true },
    reporters: [
      'verbose',
      new BenchmarkReporter({
        title: 'React JSX 输入转换性能',
        artifact: 'vite-source',
        dimensionLabels: ['操作', '输入形态', '规模'],
        sourceDirectory: 'src',
        sourceDependencies: ['../vanilla/src', '../foundation/src'],
        configFiles: ['vitest.bench.config.ts', 'package.json'],
        budgets: scenario =>
          scenario.id.endsWith('/reference')
            ? undefined
            : {
                kind: 'workload',
                metric: 'p50',
                warningMs: 2,
                errorMs: 4,
                blocking: false,
                rationale:
                  '规划假设：常规场景在一次交互帧内为 JSX 输入转换预留 2–4ms，编译和绘制另计；4096 档仅作规模参考',
              },
      }),
    ],
  },
});
