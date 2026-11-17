import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';
import { WeaveTimingReporter } from './benchmarks/weave/_reporter';

/** Weave 更新耗时专项，缓存行为由默认功能测试验证 */
export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  test: {
    environment: 'node',
    include: [],
    benchmark: { enabled: true, include: ['benchmarks/weave/*.bench.ts'], retainSamples: true },
    reporters: [new WeaveTimingReporter()],
    maxWorkers: 1,
    fileParallelism: false,
    fsModuleCache: false,
    pool: 'threads',
  },
});
