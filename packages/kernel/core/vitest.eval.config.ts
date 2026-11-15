import { defineConfig } from 'vitest/config';

import { createRetikzDevPlugin } from '../../../config/vite/dev-plugin';

/** 只运行用例与判分器的离线功能自检，不执行模型采样 */
export default defineConfig({
  plugins: [createRetikzDevPlugin()],
  test: {
    environment: 'node',
    include: ['evals/**/*.check.ts'],
    maxWorkers: 1,
    fileParallelism: false,
    pool: 'threads',
  },
});
