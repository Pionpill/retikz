import type { CompileOptions, ReconcilerResult, ReconcilerUpdateStrategy } from '@retikz/reconciler';
import { ReconcilerMode, SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

import type { BenchmarkExecution } from '../../../../../scripts/benchmarks/scenario';
import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { benchmarkCompileOptions, inspectBenchmarkScene } from './_execution';
import { compileBenchmarkSnapshot, verifyBenchmarkSnapshot } from './_snapshot';
import type { UpdateBenchmarkCase, UpdateBenchmarkWorkload } from './_update-workload';
import { countSceneElements } from './_update-workload';

/** 被测编译能力及来源配置，不包含宿主或 renderer */
export type UpdateBenchmarkOptions = {
  compileOptions?: CompileOptions;
  captureProvenance?: boolean;
  allowDiagnostics?: boolean;
};

/** 持久会话交替真实状态；构造、独立编译计数和校验都在计时外 */
export const createUpdateBenchmark = (
  workload: UpdateBenchmarkWorkload,
  strategy: ReconcilerUpdateStrategy,
  options: UpdateBenchmarkOptions = {},
): BenchmarkExecution<ReconcilerResult> => {
  const sourceBefore = JSON.stringify(workload.states);
  const compileOptions = { ...benchmarkCompileOptions, ...options.compileOptions, onWarn: () => {} };
  const execution = {
    mode: ReconcilerMode.Incremental,
    updateStrategy: strategy,
    captureProvenance: options.captureProvenance,
  };
  const expected = workload.states.map(scene =>
    compileBenchmarkSnapshot(scene, compileOptions, options.captureProvenance, options.allowDiagnostics),
  );
  if (workload.change === 'real') expect(expected[0].result).not.toEqual(expected[1].result);
  else expect(expected[0].result).toEqual(expected[1].result);
  const verifyOutput = (result: ReconcilerResult, index: number, isolated: ReadonlyArray<unknown>) =>
    verifyBenchmarkSnapshot(result.compilation, expected[index], isolated);

  const observations: Record<string, number> = {
    elementsA: countSceneElements(workload.states[0]),
    elementsB: countSceneElements(workload.states[1]),
    changedElements: workload.changedElements,
    primitivesA: inspectBenchmarkScene(expected[0].result).leaves.length,
    primitivesB: inspectBenchmarkScene(expected[1].result).leaves.length,
    resourcesA:
      (expected[0].result.scene.resources?.paints.length ?? 0) +
      (expected[0].result.scene.resources?.clips.length ?? 0),
    resourcesB:
      (expected[1].result.scene.resources?.paints.length ?? 0) +
      (expected[1].result.scene.resources?.clips.length ?? 0),
    compiledForward: 0,
    compiledBackward: 0,
  };
  // 独立 trace 会话验证两个方向；计时会话不安装观察回调
  let compiled = 0;
  const probe = new SceneReconciler(compileOptions, {
    ...execution,
    trace: record => {
      if (record.phase === 'update' && record.unit === 'element-compile') compiled += record.visited;
    },
  });
  try {
    probe.mount(workload.states[0]);
    const batches = workload.batches(probe.getScopeId(), path => probe.getScopeId(path));
    observations.operationsForward = batches[0].operations.length;
    observations.operationsBackward = batches[1].operations.length;
    verifyOutput(probe.update(batches[0]), 1, probe.diagnostics());
    observations.compiledForward = compiled;
    compiled = 0;
    verifyOutput(probe.update(batches[1]), 0, probe.diagnostics());
    observations.compiledBackward = compiled;
  } finally {
    probe.dispose();
  }

  const session = new SceneReconciler(compileOptions, execution);
  try {
    const mounted = session.mount(workload.states[0]);
    const batches = workload.batches(session.getScopeId(), path => session.getScopeId(path));
    const batchesBefore = JSON.stringify(batches);
    let direction = 1;
    let iteration = 0;
    let result = mounted;
    let selectedBatch = batches[0];
    const verify = () => {
      verifyOutput(result, direction === 0 ? 1 : 0, session.diagnostics());
      expect(result.revision).toBe(workload.change === 'empty' && strategy !== 'full' ? 0 : iteration);
      expect(JSON.stringify(workload.states)).toBe(sourceBefore);
      expect(JSON.stringify(batches)).toBe(batchesBefore);
    };
    return {
      observations,
      beforeEach: () => {
        direction = direction === 0 ? 1 : 0;
        iteration++;
        // 每次都有新 input 对象；避免等值场景退化为引用相等快速路径
        selectedBatch = workload.change === 'equal' ? structuredClone(batches[direction]) : batches[direction];
      },
      run: () => (result = session.update(selectedBatch)),
      afterEach: () => {
        if (iteration <= 2 || iteration >= 109) verify();
      },
      verify,
      dispose: () => session.dispose(),
    };
  } catch (error) {
    session.dispose();
    throw error;
  }
};

/** 同场景独立注册 auto/full 会话；不把强制全量批次误称非增量首次编译 */
export const defineUpdateBenchmarks = (domain: string, cases: ReadonlyArray<UpdateBenchmarkCase>): void => {
  for (const entry of cases)
    for (const count of [100, 1000])
      for (const strategy of ['auto', 'full'] as const)
        defineBenchmark(
          {
            id: `reconciler/update/${domain}/${entry.kind}/${count}/${strategy}`,
            dimensions: ['增量更新', domain, entry.label, `${count} 主体元素；实际元素数见工作量表`, strategy],
          },
          () => createUpdateBenchmark(entry.create(count), strategy),
          false,
          600_000,
        );
};
