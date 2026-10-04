import { compileToScene, CORE_SOURCE_KEY, CoreSourceDefinition, createCoreComputation } from '@retikz/core';
import type { PerformanceTraceRecord } from '@retikz/runtime';
import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  createRuntimeTraceReporter,
  PerformanceTraceOutcome,
  PerformanceTracePhase,
  PerformanceTraceUnit,
} from '@retikz/runtime';

import type { BenchmarkExecution, DeterministicBenchmarkResult } from './budget';
import { createSimpleNodeScene, updateSimpleNodeFill } from './fixtures';
import { stableHash } from './hash';
import { assertFullTrace, assertSingleTraceRecord } from './trace';

/** ADR-01 固定的 full baseline 规模 */
export const fullBaselineSizes = Object.freeze([100, 1_000, 5_000] as const);

/** 把已验证 trace 与功能摘要组合成确定性 benchmark 结果 */
export const toResult = (
  id: string,
  oracle: string,
  record: PerformanceTraceRecord,
  liveHandles?: number,
  execution?: BenchmarkExecution,
): DeterministicBenchmarkResult =>
  Object.freeze({
    id,
    oracle,
    visited: record.visited,
    reused: record.reused,
    changed: record.changed,
    ...(liveHandles === undefined ? {} : { liveHandles }),
    ...(execution === undefined ? {} : { execution: Object.freeze({ ...execution }) }),
  });

/** 在 Node 环境运行 Core full-path 确定性 benchmark */
export const runCoreDeterministicBenchmarks = (): ReadonlyArray<DeterministicBenchmarkResult> => {
  const results: Array<DeterministicBenchmarkResult> = [];
  for (const size of fullBaselineSizes) {
    const coreRecords: Array<PerformanceTraceRecord> = [];
    const reporter = createRuntimeTraceReporter({
      owner: '@retikz/core',
      phases: [
        {
          phase: PerformanceTracePhase.Compile,
          unit: PerformanceTraceUnit.IrChild,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      sink: record => coreRecords.push(record),
    });
    const compiled = compileToScene(createSimpleNodeScene(size), { trace: reporter });
    const coreRecord = assertFullTrace(`core-full-${size}`, reporter, coreRecords, {
      phase: PerformanceTracePhase.Compile,
      unit: PerformanceTraceUnit.IrChild,
      visited: size,
    });
    const sceneOracle = stableHash(compiled.scene);
    results.push(toResult(`core-full-${size}`, sceneOracle, coreRecord));
  }
  const current = createSimpleNodeScene(5_000);
  const next = updateSimpleNodeFill(current, 2_500, '#22c55e');
  const program = createCoreComputation({ onWarn: () => undefined });
  const sources = createRuntimeSourceRegistry({ builtins: [CoreSourceDefinition] });
  const computations = createRuntimeComputationRegistry({ sources, builtins: [program] });
  const records: Array<PerformanceTraceRecord> = [];
  const session = createRuntime({
    sources,
    computations,
    initialSnapshots: [createRuntimeSourceInput(CoreSourceDefinition, current)],
    trace: record => records.push(record),
  });
  try {
    records.length = 0;
    session.update({
      baseRevision: session.revision(),
      sources: [createRuntimeSourceUpdate(CoreSourceDefinition, next)],
    });
    const artifact = session.artifact(program).value;
    const record = assertSingleTraceRecord('core-single-entity-update-5000', records, {
      owner: CORE_SOURCE_KEY,
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.IrChild,
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 5_000,
      reused: 4_999,
      changed: 1,
    });
    assertSingleTraceRecord('core-single-entity-update-5000', records, {
      owner: CORE_SOURCE_KEY,
      phase: PerformanceTracePhase.Update,
      unit: PerformanceTraceUnit.SceneChange,
      outcome: PerformanceTraceOutcome.Incremental,
      visited: 1,
      reused: 0,
      changed: 1,
    });
    if (
      artifact.patch?.operations.length !== 1 ||
      artifact.patch.operations[0]?.kind !== 'update' ||
      stableHash(artifact.output.result.scene) !== stableHash(compileToScene(next).scene)
    ) {
      throw new Error('core-single-entity-update-5000: incremental patch or full oracle mismatch');
    }
    results.push(toResult('core-single-entity-update-5000', stableHash(artifact.output.result.scene), record));
  } finally {
    session.dispose();
  }
  return Object.freeze(results);
};
