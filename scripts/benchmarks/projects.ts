import type { TestUserConfig } from 'vitest/node';

/** 先完成所有耗时场景，再独立运行分配采样；两组使用相同的场景定义 */
export const createBenchmarkProjects = (memory: boolean): NonNullable<TestUserConfig['projects']> => {
  const projects: NonNullable<TestUserConfig['projects']> = [
    {
      extends: true,
      test: {
        name: 'latency',
        // Vitest 5 会从此项派生 bench project；原始功能测试项不参与共享基准命令
        exclude: ['**/*'],
        benchmark: { enabled: true },
        sequence: { groupOrder: 0 },
        provide: { benchmarkPhase: 'latency' },
      },
    },
  ];
  if (memory)
    projects.push({
      extends: true,
      test: {
        name: 'allocation',
        exclude: ['**/*'],
        benchmark: { enabled: true },
        sequence: { groupOrder: 1 },
        provide: { benchmarkPhase: 'allocation' },
      },
    });
  return projects;
};
