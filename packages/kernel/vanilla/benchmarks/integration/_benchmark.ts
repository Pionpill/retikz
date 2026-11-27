import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import type { BenchmarkExecution } from '../../../../../scripts/benchmarks/scenario';
import type { BenchmarkIdentity } from '../../../../../scripts/benchmarks/types';
import { measureOperation } from './_timer';

/** 每轮计时与同一次公开调用配对，复用公共基准的生命周期和正确性验证 */
export const defineIntegrationBenchmark = <T>(
  identity: BenchmarkIdentity,
  setup: () => BenchmarkExecution<T>,
  reference = false,
  timeout = 120000,
) => {
  defineBenchmark(
    identity,
    () => {
      const execution = setup();
      const samples: Parameters<typeof measureOperation>[1] = [];
      return { ...execution, run: () => measureOperation(execution.run, samples), readSampleTimings: () => samples };
    },
    reference,
    timeout,
  );
};
