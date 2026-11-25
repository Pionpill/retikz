import { expect, inject, test } from 'vitest';

import { largeWorkloadSampling, referenceSampling, sampling } from './sampling';
import type { BenchmarkIdentity, BenchmarkMeasurement } from './types';

/** 生命周期钩子在单次计时之外执行；dispose 在成功或失败后释放整个场景 */
export type BenchmarkExecution<T> = {
  run: () => T;
  verify: (result: T) => void;
  beforeEach?: () => void;
  afterEach?: () => void;
  dispose?: () => void;
  /** 按运行顺序返回同次操作的分段样本；公共驱动剔除预热 */
  readSampleTimings?: () => ReadonlyArray<Readonly<Record<string, number>>>;
  observations?: Readonly<Record<string, number>>;
};

/** 注册同步算法场景；fixture 构造和结果断言均在计时区间之外 */
export const defineBenchmark = <T>(
  identity: BenchmarkIdentity,
  setup: () => BenchmarkExecution<T>,
  reference = false,
  timeout = 120_000,
): void => {
  const { id: name, dimensions } = identity;
  test(`${name}${reference ? '/reference' : ''}`, { timeout }, async ({ bench, task }) => {
    task.meta.benchmarkDimensions = dimensions;
    const phase = inject('benchmarkPhase') ?? 'latency';
    task.meta.benchmarkPhase = phase;
    if (phase === 'allocation') {
      if (reference) {
        task.meta.allocation = {
          status: 'skipped',
          calls: 0,
          warmupCalls: 0,
          sampleCount: 0,
          samplingInterval: 0,
          reason: '参考档保持总共3次算法调用，不额外执行分配采样',
        };
        return;
      }
      const execution = setup();
      try {
        const { measureAllocations } = await import('./allocation');
        task.meta.allocation = await measureAllocations(execution);
      } finally {
        execution.dispose?.();
      }
      return;
    }
    const { run, verify, beforeEach, afterEach, dispose, observations, readSampleTimings } = setup();
    const options = reference
      ? referenceSampling
      : (identity.workloadSize ?? 0) >= 10_000
        ? largeWorkloadSampling
        : sampling;
    const expectedCalls = options.iterations + options.warmupIterations;
    let calls = 0;
    let result: T | undefined;
    const measurement: BenchmarkMeasurement = {
      mode: reference ? 'reference' : 'normal',
      sampling: options,
      calls: 0,
      ...(observations ? { observations } : {}),
    };
    task.meta.measurement = measurement;
    try {
      const measured = await bench(name, { async: false, beforeEach, afterEach }, () => {
        calls++;
        if (calls > expectedCalls) throw new Error('Benchmark exceeded its configured call limit');
        result = run();
      }).run(options);
      expect(calls).toBe(expectedCalls);
      expect(measured.latency.samples).toHaveLength(options.iterations);
      // run 可以合法返回 undefined，因此用调用次数而非返回值判断是否执行
      expect(calls).toBeGreaterThan(0);
      if (readSampleTimings) {
        const timings = readSampleTimings();
        expect(timings.length).toBe(calls);
        measurement.sampleTimingsMs = timings.slice(options.warmupIterations);
        expect(measurement.sampleTimingsMs.length).toBe(options.iterations);
      }
      verify(result as T);
    } finally {
      measurement.calls = calls;
      dispose?.();
    }
  });
};
