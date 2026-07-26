import type { PerformanceTraceRecord } from '@retikz/runtime';

import { compileToScene } from '@retikz/core';
import { createRuntimeTraceReporter } from '@retikz/runtime';

import type { DeterministicBenchmarkResult } from './budget';

import { createSimpleNodeScene } from './fixtures';
import { stableHash } from './hash';
import { assertFullTrace } from './trace';

/** ADR-01 固定的 full baseline 规模 */
export const fullBaselineSizes = Object.freeze([100, 1_000, 5_000] as const);

/** 把已验证 trace 与功能摘要组合成确定性 benchmark 结果 */
export const toResult = (id: string, oracle: string, record: PerformanceTraceRecord): DeterministicBenchmarkResult =>
  Object.freeze({ id, oracle, visited: record.visited, reused: record.reused, changed: record.changed });

/** 在 Node 环境运行 Core full-path 确定性 benchmark */
export const runCoreDeterministicBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  for (const size of fullBaselineSizes) {
    const coreRecords: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [{ phase: 'compile', unit: 'ir-child', outcomes: ['full'] }],
      sink: record => coreRecords.push(record),
    });
    const compiled = compileToScene(createSimpleNodeScene(size), { trace: reporter });
    const coreRecord = assertFullTrace(`core-full-${size}`, reporter, coreRecords, {
      phase: 'compile',
      unit: 'ir-child',
      visited: size,
    });
    const sceneOracle = stableHash(compiled.scene);
    results.push(toResult(`core-full-${size}`, sceneOracle, coreRecord));
  }
  return Object.freeze(results);
};
