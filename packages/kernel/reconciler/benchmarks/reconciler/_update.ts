import type { IRScene } from '@retikz/core';
import type { CompileResult, ReconcilerResult, ReconcilerUpdateStrategy } from '@retikz/reconciler';
import { SceneReconciler } from '@retikz/reconciler';
import { expect } from 'vitest';

import type { BenchmarkExecution } from '../../../../../scripts/benchmarks/scenario';
import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import { benchmarkCompileOptions } from './_execution';
import type { UpdateBenchmarkCase, UpdateBenchmarkWorkload } from './_update-workload';
import { countSceneElements } from './_update-workload';

/** 非增量输出作为独立参照；JSON 值比较忽略内部对象原型差异 */
const compileExpected = (scene: IRScene): unknown => {
  const reconciler = new SceneReconciler(benchmarkCompileOptions, { incremental: false });
  try {
    return JSON.parse(JSON.stringify(reconciler.mount(scene).compilation.result));
  } finally {
    reconciler.dispose();
  }
};

/** 持久会话交替真实状态；构造、独立编译计数和校验都在计时外 */
export const createUpdateBenchmark = (
  workload: UpdateBenchmarkWorkload,
  strategy: ReconcilerUpdateStrategy,
): BenchmarkExecution<ReconcilerResult> => {
  const sourceBefore = JSON.stringify(workload.states);
  const expected = workload.states.map(compileExpected);
  if (workload.change === 'real') expect(expected[0]).not.toEqual(expected[1]);
  else expect(expected[0]).toEqual(expected[1]);
  const verifyOutput = (result: CompileResult, index: number) =>
    expect(JSON.parse(JSON.stringify(result))).toEqual(expected[index]);

  const observations: Record<string, number> = {
    elementsA: countSceneElements(workload.states[0]),
    elementsB: countSceneElements(workload.states[1]),
    changedElements: workload.changedElements,
    compiledForward: 0,
    compiledBackward: 0,
  };
  // 独立 trace 会话验证两个方向；计时会话不安装观察回调
  let compiled = 0;
  const probe = new SceneReconciler(benchmarkCompileOptions, {
    incremental: true,
    updateStrategy: strategy,
    trace: record => {
      if (record.phase === 'update' && record.unit === 'element-compile') compiled += record.visited;
    },
  });
  try {
    probe.mount(workload.states[0]);
    const batches = workload.batches(probe.getScopeId());
    observations.operationsForward = batches[0].operations.length;
    observations.operationsBackward = batches[1].operations.length;
    verifyOutput(probe.update(batches[0]).compilation.result, 1);
    observations.compiledForward = compiled;
    compiled = 0;
    verifyOutput(probe.update(batches[1]).compilation.result, 0);
    observations.compiledBackward = compiled;
  } finally {
    probe.dispose();
  }

  const session = new SceneReconciler(benchmarkCompileOptions, { incremental: true, updateStrategy: strategy });
  try {
    const mounted = session.mount(workload.states[0]);
    const batches = workload.batches(session.getScopeId());
    const batchesBefore = JSON.stringify(batches);
    let direction = 1;
    let iteration = 0;
    let result = mounted;
    let selectedBatch = batches[0];
    const verify = () => {
      verifyOutput(result.compilation.result, direction === 0 ? 1 : 0);
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
