import { expect, test } from 'vitest';

import { referenceSampling, sampling } from './sampling';
import type { BenchmarkIdentity, BenchmarkMeasurement } from './types';

/** 注册同步算法场景；fixture 构造和结果断言均在计时区间之外 */
export const defineBenchmark = <T>(
  identity: BenchmarkIdentity,
  setup: () => { run: () => T; verify: (result: T) => void },
  reference = false,
): void => {
  const { id: name, dimensions } = identity;
  test(`${name}${reference ? '/reference' : ''}`, { timeout: 120_000 }, async ({ bench, task }) => {
    task.meta.benchmarkDimensions = dimensions;
    const { run, verify } = setup();
    const options = reference ? referenceSampling : sampling;
    let calls = 0;
    let result: T | undefined;
    const measurement: BenchmarkMeasurement = {
      mode: reference ? 'reference' : 'normal',
      sampling: options,
      calls: 0,
    };
    task.meta.measurement = measurement;
    try {
      const measured = await bench(name, { async: false }, () => {
        calls++;
        // 即使测量引擎改变，也不允许参考档额外执行算法
        if (reference && calls > 3) throw new Error('Reference workload exceeded three calls');
        result = run();
      }).run(options);
      if (reference) {
        expect(calls).toBe(3);
        expect(measured.latency.samples).toHaveLength(3);
      } else {
        expect(calls).toBe(sampling.iterations + sampling.warmupIterations);
        expect(measured.latency.samples).toHaveLength(sampling.iterations);
      }
      // run 可以合法返回 undefined，因此用调用次数而非返回值判断是否执行
      expect(calls).toBeGreaterThan(0);
      verify(result as T);
    } finally {
      measurement.calls = calls;
    }
  });
};
