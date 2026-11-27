import type { IRScene } from '@retikz/core';
import { expect } from 'vitest';

import { defineBenchmark } from '../../../../../scripts/benchmarks/scenario';
import type { BenchmarkExecution } from '../../../../../scripts/benchmarks/scenario';
import { ReconcilerMode, SceneReconciler } from '../../src';
import type { CompileOptions, CompileResult, ReconcilerResult } from '../../src';
import type { InputWeaveOwn, WeaveBatch } from '../../src/weave';
import { benchmarkCompileOptions } from '../reconcile/_execution';

/** 单次更新及独立的完整 Scene 参照，不声明内部阶段命中预期 */
export type CacheStep = {
  label: string;
  update: InputWeaveOwn;
  parentPath?: ReadonlyArray<number>;
  scene: IRScene;
};

/** 输入配方描述等值或变化的更新情况，缓存契约由功能测试保护 */
export type CacheScenario = {
  domain: 'coordinate' | 'node' | 'path' | 'scope';
  label: string;
  scene: IRScene;
  steps: ReadonlyArray<CacheStep>;
};

/** 复用既有固定文字度量，不允许编译诊断在基准中静默丢失 */
const compileOptions: CompileOptions<never> = {
  ...benchmarkCompileOptions,
  onWarn: () => {},
};

/** 每个样本在计时外恢复相同前置状态，仅测量当前完整 update */
const createCacheTiming = (
  create: () => CacheScenario,
  reference: CacheScenario,
  index: number,
): BenchmarkExecution<ReconcilerResult> => {
  const before = JSON.stringify(reference);
  const oracle = new SceneReconciler(compileOptions);
  let expected: CompileResult;
  try {
    const referenceResult = oracle.mount(reference.steps[index].scene);
    expect(referenceResult.compilation.diagnostics).toEqual([]);
    expect(oracle.diagnostics()).toEqual([]);
    expected = referenceResult.compilation.result;
  } finally {
    oracle.dispose();
  }
  const observations = { mounts: 0, prerequisiteUpdates: 0, targetUpdates: 0 };
  let scenario: CacheScenario;
  let reconciler: SceneReconciler | undefined;
  let result: ReconcilerResult;
  let batch: WeaveBatch;
  const dispose = () => {
    reconciler?.dispose();
    reconciler = undefined;
  };
  const createBatch = (step: CacheStep): WeaveBatch => {
    if (step.update.id === undefined) throw new Error('Cache benchmarks require authored IDs');
    return {
      operations: [
        {
          kind: 'update',
          target: { kind: 'id', scopeId: reconciler!.getScopeId(step.parentPath ?? []), id: step.update.id },
          input: step.update,
        },
      ],
    };
  };
  const verify = (value: ReconcilerResult) => {
    expect(value.compilation.result).toEqual(expected);
    expect(value.compilation.diagnostics).toEqual([]);
    expect(JSON.stringify(scenario)).toBe(before);
  };
  return {
    observations,
    beforeEach: () => {
      scenario = create();
      expect(JSON.stringify(scenario)).toBe(before);
      reconciler = new SceneReconciler(compileOptions, { mode: ReconcilerMode.Incremental, updateStrategy: 'auto' });
      const mounted = reconciler.mount(scenario.scene);
      expect(mounted.compilation.diagnostics).toEqual([]);
      expect(reconciler.diagnostics()).toEqual([]);
      observations.mounts++;
      for (const step of scenario.steps.slice(0, index)) {
        const prerequisite = reconciler.update(createBatch(step));
        expect(prerequisite.compilation.diagnostics).toEqual([]);
        expect(reconciler.diagnostics()).toEqual([]);
        observations.prerequisiteUpdates++;
      }
      batch = createBatch(scenario.steps[index]);
    },
    run: () => (result = reconciler!.update(batch)),
    afterEach: () => {
      observations.targetUpdates++;
      try {
        verify(result);
        expect(reconciler?.diagnostics()).toEqual([]);
      } finally {
        dispose();
      }
    },
    verify,
    dispose,
  };
};

/** 逐情况注册耗时基准，采样与次数校验使用共享 helper，不设置时间门槛 */
export const defineCacheScenario = (create: () => CacheScenario): void => {
  const scenario = create();
  for (const [index, step] of scenario.steps.entries())
    defineBenchmark(
      {
        id: `${scenario.domain}/${scenario.label}/${step.label}`,
        dimensions: [scenario.domain, scenario.label, step.label],
      },
      () => createCacheTiming(create, scenario, index),
    );
};
