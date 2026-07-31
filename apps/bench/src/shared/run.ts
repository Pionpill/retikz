import type { PerformanceTraceRecord } from '@retikz/runtime';

import { compileToScene, CORE_OWNER_KEY, CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  createRuntimeTraceReporter,
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
  const current = createSimpleNodeScene(5_000);
  const next = updateSimpleNodeFill(current, 2_500, '#22c55e');
  const program = createCoreProgram({ onWarn: () => undefined });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
  const records: Array<PerformanceTraceRecord> = [];
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, current)],
    trace: record => records.push(record),
  });
  try {
    records.length = 0;
    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
    const artifact = session.artifact(program).value;
    const record = assertSingleTraceRecord('core-single-entity-update-5000', records, {
      owner: CORE_OWNER_KEY,
      phase: 'update',
      unit: 'ir-child',
      outcome: 'incremental',
      visited: 5_000,
      reused: 4_999,
      changed: 1,
    });
    assertSingleTraceRecord('core-single-entity-update-5000', records, {
      owner: CORE_OWNER_KEY,
      phase: 'update',
      unit: 'scene-change',
      outcome: 'incremental',
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
