import { describe, expect, it } from 'vitest';

import { formatReport } from '../../../../../scripts/benchmarks/report';
import type { BenchmarkReport, BenchmarkScenario } from '../../../../../scripts/benchmarks/types';
import { resolveReconcilerBudget } from '../../benchmarks/_budgets';

const scenario = (path: string): BenchmarkScenario => ({
  id: `entry > reconciler/${path}`,
  execution: 'passed',
  errors: [],
});

describe('性能报告消费口径', () => {
  it('强制全量更新只报告，auto保留P50消费预算与既有结构场景上限', () => {
    expect(resolveReconcilerBudget(scenario('update/node/style/1000/full'))).toBeUndefined();
    expect(resolveReconcilerBudget(scenario('update/node/style/1000/auto'))).toMatchObject({
      metric: 'p50',
      warningMs: 4,
      errorMs: 8,
    });
    expect(resolveReconcilerBudget(scenario('update/scene/structure/1000/auto'))).toMatchObject({
      warningMs: 4,
      errorMs: 8,
    });
  });
  it('展示均值与P50，表格列数一致，不把执行成功当性能达标', () => {
    const report: BenchmarkReport = {
      version: 5,
      allocationEnabled: false,
      createdAt: '2026-11-17T00:00:00Z',
      dimensionLabels: ['场景'],
      source: { commit: 'snapshot', dirty: false, sourceHash: 'source' },
      errors: [],
      environment: {
        runnerId: 'test',
        node: 'test',
        platform: 'test',
        architecture: 'test',
        cpuModels: ['test'],
        logicalCpuCount: 1,
        totalMemoryBytes: 1,
        vitest: 'test',
        lockHash: 'lock',
        fixtureHash: 'fixture',
        artifact: 'vite-source',
        pool: 'threads',
        maxWorkers: 1,
        isolate: true,
        sampling: { time: 0, iterations: 100, warmupTime: 0, warmupIterations: 10 },
      },
      scenarios: [
        {
          ...scenario('update/node/style/100/auto'),
          dimensions: ['更新'],
          statistics: { samples: 100, mean: 2, p50: 1, p90: 3, p99: 4 },
          assessment: { status: 'report-only' },
        },
      ],
    };
    const markdown = formatReport(report);
    expect(markdown).toContain('P50');
    expect(markdown).not.toMatch(/P90|P99/);
    const table = markdown
      .split('## 测量结果')[1]
      .split('## 运行错误')[0]
      .split('\n')
      .filter(line => line.startsWith('|'));
    expect(table).toHaveLength(3);
    expect(new Set(table.map(line => line.split('|').length)).size).toBe(1);
  });
});
