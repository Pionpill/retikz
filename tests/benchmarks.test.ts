import type { HeapProfiler } from 'node:inspector';

import { describe, expect, it } from 'vitest';

import { measureAllocations, summarizeAllocationProfile } from '../scripts/benchmarks/allocation';
import { parseBaseline, shouldFailReport } from '../scripts/benchmarks/index';
import { formatReport } from '../scripts/benchmarks/report';
import type { BenchmarkReport } from '../scripts/benchmarks/types';

/** 最小完整报告，保护单次分配统计及报告语义 */
const createReport = (): BenchmarkReport => ({
  version: 4,
  dimensionLabels: ['算法'],
  createdAt: '2026-11-17T00:00:00.000Z',
  environment: {
    runnerId: 'unit',
    node: 'v22.14.0',
    platform: 'win32',
    architecture: 'x64',
    cpuModels: ['unit-cpu'],
    logicalCpuCount: 4,
    totalMemoryBytes: 16 * 1024 ** 3,
    vitest: '5.0.0',
    lockHash: 'lock',
    fixtureHash: 'fixture',
    artifact: 'native-esm',
    pool: 'threads',
    maxWorkers: 1,
    isolate: true,
    sampling: { time: 0, iterations: 100, warmupTime: 0, warmupIterations: 10 },
  },
  source: { commit: 'snapshot', dirty: false, sourceHash: 'source' },
  errors: [],
  scenarios: [
    {
      id: 'algorithm',
      dimensions: ['算法'],
      execution: 'passed',
      errors: [],
      statistics: { samples: 100, mean: 0.25, p50: 0.2, p90: 0.5, p99: 0.8 },
      measurement: {
        mode: 'normal',
        calls: 110,
        sampling: { time: 0, iterations: 100, warmupTime: 0, warmupIterations: 10 },
      },
      assessment: { status: 'passed' },
      allocation: {
        status: 'measured',
        calls: 100,
        warmupCalls: 10,
        sampleCount: 30,
        samplingInterval: 128,
        estimatedTotalBytes: 6400,
      },
    },
  ],
});

describe('单次分配报告', () => {
  it('用本用例采样总分配量除以实际调用数展示 B/op，采样不足不伪报零', () => {
    const report = createReport();
    expect(formatReport(report)).toContain('64.0 B/op');
    expect(formatReport(report)).toContain('估算单次分配');
    report.scenarios[0].allocation = {
      status: 'insufficient',
      calls: 100,
      warmupCalls: 10,
      sampleCount: 0,
      samplingInterval: 128,
      estimatedTotalBytes: 0,
    };
    expect(formatReport(report)).toContain('无法可靠估计');
    expect(formatReport(report)).not.toContain('0 B/op');
  });

  it('只有可靠估计超过单次观察线才提示，不影响进程退出', () => {
    const report = createReport();
    report.allocationPolicy = { warningBytesPerOp: 32, rationale: '单次分配观察线' };
    expect(formatReport(report)).toContain('🟡');
    expect(formatReport(report)).toContain('单次分配偏高');
    expect(shouldFailReport(report)).toBe(false);
    report.scenarios[0].allocation = {
      status: 'insufficient',
      calls: 100,
      warmupCalls: 10,
      sampleCount: 1,
      samplingInterval: 32768,
      estimatedTotalBytes: 1024 ** 3,
    };
    expect(formatReport(report)).not.toContain('单次分配偏高');
  });

  it('基线解析拒绝非法采样事实，并接受当前两种加载身份', () => {
    for (const estimatedTotalBytes of [-1, null, '6400']) {
      const report = createReport();
      const value = {
        ...report,
        scenarios: [{ ...report.scenarios[0], allocation: { ...report.scenarios[0].allocation, estimatedTotalBytes } }],
      };
      expect(() => parseBaseline(JSON.stringify(value))).toThrow();
    }
    expect(parseBaseline(JSON.stringify(createReport())).scenarios[0].allocation?.estimatedTotalBytes).toBe(6400);
    const report = createReport();
    report.environment.artifact = 'vite-source';
    expect(parseBaseline(JSON.stringify(report)).environment.artifact).toBe('vite-source');
  });
});

describe('分配采样边界', () => {
  it('只累计操作调用栈中的分配，排除 fixture、断言和驱动分配', () => {
    const frame = (functionName: string): HeapProfiler.SamplingHeapProfileNode['callFrame'] => ({
      functionName,
      scriptId: '1',
      url: 'test',
      lineNumber: 0,
      columnNumber: 0,
    });
    const profile = {
      head: {
        id: 0,
        callFrame: frame('root'),
        selfSize: 1000,
        children: [
          { id: 1, callFrame: frame('setup'), selfSize: 1024 ** 3, children: [] },
          {
            id: 2,
            callFrame: frame('runAllocationOperation'),
            selfSize: 32,
            children: [{ id: 3, callFrame: frame('algorithm'), selfSize: 96, children: [] }],
          },
          { id: 4, callFrame: frame('verify'), selfSize: 1024 ** 3, children: [] },
        ],
      },
      samples: [{ nodeId: 1 }, { nodeId: 2 }, { nodeId: 3 }, { nodeId: 4 }],
    };
    expect(summarizeAllocationProfile(profile)).toEqual({ estimatedTotalBytes: 128, sampleCount: 2 });
  });

  it('独立执行10轮预热和100轮采样，输入、钩子与背景存量不成为单次分配', async () => {
    const background = new Array(500_000).fill(7);
    let calls = 0;
    let beforeCalls = 0;
    let afterCalls = 0;
    const observation = await measureAllocations({
      beforeEach: () => {
        beforeCalls++;
      },
      run: () => {
        calls++;
        return new Array(4096).fill(calls);
      },
      afterEach: () => {
        afterCalls++;
      },
      verify: result => {
        expect(result).toHaveLength(4096);
        expect(result[0]).toBe(110);
      },
    });
    expect(calls).toBe(110);
    expect(beforeCalls).toBe(110);
    expect(afterCalls).toBe(110);
    expect(observation.status).toBe('measured');
    expect(observation.calls).toBe(100);
    expect(observation.warmupCalls).toBe(10);
    expect(observation.sampleCount).toBeGreaterThanOrEqual(16);
    expect(observation.estimatedTotalBytes).toBeGreaterThan(0);
    expect((observation.estimatedTotalBytes ?? 0) / observation.calls).toBeLessThan(128 * 1024);
    expect((observation.estimatedTotalBytes ?? 0) / observation.calls).toBeGreaterThan(16 * 1024);
    expect(background[0]).toBe(7);
  });

  it('算法错误不能被伪装成 profiler 不可用', async () => {
    await expect(
      measureAllocations({
        run: () => {
          throw new Error('workload failed');
        },
        verify: () => {},
      }),
    ).rejects.toThrow('workload failed');
  });

  it('连续场景中的短函数仍保留可识别的分配边界', async () => {
    for (let index = 0; index < 30; index++) {
      const observation = await measureAllocations({
        run: () => new Array(32).fill(index),
        verify: result => expect(result[0]).toBe(index),
      });
      expect(observation.status, `场景 ${index} 的分配调用栈丢失`).toBe('measured');
    }
  });
});
