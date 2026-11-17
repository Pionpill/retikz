import type { TestUserConfig } from 'vitest/node';

/** 先完成所有耗时场景，再独立运行分配采样；两组使用相同的场景定义 */
export const benchmarkProjects: NonNullable<TestUserConfig['projects']> = [
  { extends: true, test: { name: 'latency', sequence: { groupOrder: 0 }, provide: { benchmarkPhase: 'latency' } } },
  {
    extends: true,
    test: { name: 'allocation', sequence: { groupOrder: 1 }, provide: { benchmarkPhase: 'allocation' } },
  },
];
