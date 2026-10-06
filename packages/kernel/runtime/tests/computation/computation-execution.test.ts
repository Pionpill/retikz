import { describe, expect, it, vi } from 'vitest';

import {
  defineRuntimeComputation,
  RuntimeComputationExecution,
  RuntimeComputationKind,
  RuntimeComputationPhase,
} from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeChangeSet, createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineCounterSource = (key = 'counter') =>
  defineRuntimeSource<number, number, number, { delta: number }>({
    key,
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime Computation execution', () => {
  it('默认 auto 向 Computation 暴露 initial full 与 incremental update execution', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const executions: Array<unknown> = [];
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'execution-default' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value };
      },
      update: (_previous, view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.outcome).toBe(RuntimeComputationKind.Incremental);
    expect(executions).toEqual([RuntimeComputationExecution.Full, RuntimeComputationExecution.Incremental]);
  });

  it('full strategy 跳过 Computation update 并只以 full execution 调用 run', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const executions: Array<unknown> = [];
    const update = vi.fn(() => ({ kind: RuntimeComputationKind.Incremental, result: 999 }));
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'forced-full' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value };
      },
      update,
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      updateStrategy: 'full',
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeComputationKind.Full, diagnostics: [] });
    expect(update).not.toHaveBeenCalled();
    expect(executions).toEqual([RuntimeComputationExecution.Full, RuntimeComputationExecution.Full]);
    expect(runtime.result(computation)).toEqual({ revision: 1, value: 2 });
  });

  it('CandidateView 精确区分同一 Computation 已声明 owner 的实际变化', () => {
    const primarySource = defineCounterSource('primary-changed');
    const stableSource = defineCounterSource('stable-owner');
    const sources = createRuntimeSourceRegistry([primarySource, stableSource]);
    const observations: Array<Readonly<[boolean, boolean]>> = [];
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'primary-changed', key: 'changed-observer' },
      sources: [primarySource, stableSource],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(primarySource).value }),
      update: (_previous, view) => {
        observations.push(Object.freeze([view.isChanged(primarySource), view.isChanged(stableSource)]));
        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(primarySource).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(primarySource, 1), createRuntimeSourceInput(stableSource, 7)],
    });

    runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(primarySource, 2)],
    });

    expect(observations).toEqual([[true, false]]);
  });

  it('只执行直接与传递失效分支，并复用无关 Computation result', () => {
    const primarySource = defineCounterSource('primary');
    const unrelatedSource = defineCounterSource('unrelated');
    const sources = createRuntimeSourceRegistry([primarySource, unrelatedSource]);
    const directRun = vi.fn(view => ({
      kind: RuntimeComputationKind.Full,
      result: view.snapshot(primarySource).value,
    }));
    const directCapture = vi.fn((value: number) => value);
    const directObserver = vi.fn();
    const directUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.snapshot(primarySource).value,
    }));
    const direct = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'primary', key: 'direct' },
      sources: [primarySource],
      computations: [],
      tracePhases: [],
      result: { capture: directCapture, readForComputation: value => value, read: value => value },
      run: directRun,
      update: directUpdate,
      observeCommit: directObserver,
    });
    const transitiveRun = vi.fn(view => ({
      kind: RuntimeComputationKind.Full,
      result: view.result(direct).value * 10,
    }));
    const transitiveCapture = vi.fn((value: number) => value);
    const transitiveObserver = vi.fn();
    const transitiveUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.result(direct).value * 10,
    }));
    const transitive = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'primary', key: 'transitive' },
      sources: [],
      computations: [direct],
      tracePhases: [],
      result: { capture: transitiveCapture, readForComputation: value => value, read: value => value },
      run: transitiveRun,
      update: transitiveUpdate,
      observeCommit: transitiveObserver,
    });
    const unrelatedRun = vi.fn(view => ({
      kind: RuntimeComputationKind.Full,
      result: view.snapshot(unrelatedSource).value,
    }));
    const unrelatedCapture = vi.fn((value: number) => value);
    const unrelatedObserver = vi.fn();
    const unrelatedUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.snapshot(unrelatedSource).value,
    }));
    const unrelated = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'unrelated', key: 'isolated' },
      sources: [unrelatedSource],
      computations: [],
      tracePhases: [],
      result: { capture: unrelatedCapture, readForComputation: value => value, read: value => value },
      run: unrelatedRun,
      update: unrelatedUpdate,
      observeCommit: unrelatedObserver,
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [transitive, unrelated, direct] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(primarySource, 1), createRuntimeSourceInput(unrelatedSource, 7)],
    });

    runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(primarySource, 2)],
    });

    expect(directUpdate).toHaveBeenCalledTimes(1);
    expect(transitiveUpdate).toHaveBeenCalledTimes(1);
    expect(unrelatedUpdate).not.toHaveBeenCalled();
    expect(directRun).toHaveBeenCalledTimes(1);
    expect(transitiveRun).toHaveBeenCalledTimes(1);
    expect(unrelatedRun).toHaveBeenCalledTimes(1);
    expect(directCapture).toHaveBeenCalledTimes(2);
    expect(transitiveCapture).toHaveBeenCalledTimes(2);
    expect(unrelatedCapture).toHaveBeenCalledTimes(1);
    expect(directObserver).toHaveBeenCalledTimes(2);
    expect(transitiveObserver).toHaveBeenCalledTimes(2);
    expect(unrelatedObserver).toHaveBeenCalledTimes(1);
    expect(runtime.result(direct)).toEqual({ revision: 1, value: 2 });
    expect(runtime.result(transitive)).toEqual({ revision: 1, value: 20 });
    expect(runtime.result(unrelated)).toEqual({ revision: 1, value: 7 });

    runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(unrelatedSource, 8)],
    });

    expect(directUpdate).toHaveBeenCalledTimes(1);
    expect(transitiveUpdate).toHaveBeenCalledTimes(1);
    expect(unrelatedUpdate).toHaveBeenCalledTimes(1);
    expect(directRun).toHaveBeenCalledTimes(1);
    expect(transitiveRun).toHaveBeenCalledTimes(1);
    expect(unrelatedRun).toHaveBeenCalledTimes(1);
    expect(directCapture).toHaveBeenCalledTimes(2);
    expect(transitiveCapture).toHaveBeenCalledTimes(2);
    expect(unrelatedCapture).toHaveBeenCalledTimes(2);
    expect(directObserver).toHaveBeenCalledTimes(2);
    expect(transitiveObserver).toHaveBeenCalledTimes(2);
    expect(unrelatedObserver).toHaveBeenCalledTimes(2);
    expect(runtime.result(direct)).toEqual({ revision: 2, value: 2 });
    expect(runtime.result(transitive)).toEqual({ revision: 2, value: 20 });
    expect(runtime.result(unrelated)).toEqual({ revision: 2, value: 8 });
  });

  it('缺少 change hint 时仍调用 update，并向 CandidateView 暴露 undefined', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const hints: Array<unknown> = [];
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view) => {
        hints.push(view.changeSet(owner));
        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.outcome).toBe(RuntimeComputationKind.Incremental);
    expect(hints).toEqual([undefined]);
    expect(runtime.result(computation)).toEqual({ revision: 1, value: 2 });
  });

  it('把 branded change hint 透传给 Computation，由计算判断领域含义', () => {
    const owner = defineRuntimeSource<number, number, number, { delta: number }>({
      key: 'computation-validated',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const hints: Array<unknown> = [];
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'computation-validated', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view) => {
        hints.push(view.changeSet(owner));
        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    const baseRevision = runtime.revision();
    const changeSet = createRuntimeChangeSet(baseRevision, [{ delta: 100 }]);

    const result = runtime.update({
      baseRevision,
      sources: [createRuntimeSourceUpdate(owner, 2, changeSet)],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeComputationKind.Incremental, diagnostics: [] });
    expect(hints).toEqual([changeSet]);
  });

  it('upstream full 强制 downstream full，不调用 downstream update', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const upstreamRun = vi.fn(view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }));
    const upstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'upstream' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: upstreamRun,
    });
    const downstreamExecutions: Array<unknown> = [];
    const downstreamRun = vi.fn((view, context) => {
      downstreamExecutions.push(context.execution);
      return { kind: RuntimeComputationKind.Full, result: view.result(upstream).value * 10 };
    });
    const downstreamUpdate = vi.fn((_previous, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.result(upstream).value * 10,
    }));
    const downstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'downstream' },
      sources: [],
      computations: [upstream],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: downstreamRun,
      update: downstreamUpdate,
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [downstream, upstream] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.outcome).toBe(RuntimeComputationKind.Full);
    expect(upstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(downstreamExecutions).toEqual([RuntimeComputationExecution.Full, RuntimeComputationExecution.Full]);
    expect(runtime.result(upstream)).toEqual({ revision: 1, value: 2 });
    expect(runtime.result(downstream)).toEqual({ revision: 1, value: 20 });
  });

  it('Computation fallback 调用 full run并归属 warning；upstream bailout 不触发下游', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const upstreamRun = vi.fn(view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }));
    const upstreamObserver = vi.fn();
    const upstreamUpdate = vi
      .fn()
      .mockReturnValueOnce({
        kind: RuntimeComputationKind.Fallback,
        diagnostics: [
          { code: 'COMPUTATION_FALLBACK', phase: RuntimeComputationPhase.Update, message: 'incremental unavailable' },
        ],
      })
      .mockReturnValueOnce({ kind: RuntimeComputationKind.Bailout });
    const upstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'upstream' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: upstreamRun,
      update: upstreamUpdate,
      observeCommit: upstreamObserver,
    });
    const fallbackDownstreamExecutions: Array<unknown> = [];
    const downstreamRun = vi.fn((view, context) => {
      fallbackDownstreamExecutions.push(context.execution);
      return { kind: RuntimeComputationKind.Full, result: view.result(upstream).value * 10 };
    });
    const downstreamObserver = vi.fn();
    const downstreamUpdate = vi.fn((_previous, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.result(upstream).value * 10,
    }));
    const downstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'downstream' },
      sources: [],
      computations: [upstream],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: downstreamRun,
      update: downstreamUpdate,
      observeCommit: downstreamObserver,
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [downstream, upstream] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const fallback = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(fallback.outcome).toBe(RuntimeComputationKind.Fallback);
    expect(fallback.diagnostics).toEqual([
      {
        code: 'COMPUTATION_FALLBACK',
        phase: RuntimeComputationPhase.Update,
        severity: 'warning',
        message: 'incremental unavailable',
        owner: 'counter',
        computation: { owner: 'counter', key: 'upstream' },
      },
    ]);
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(fallbackDownstreamExecutions).toEqual([
      RuntimeComputationExecution.Full,
      RuntimeComputationExecution.Fallback,
    ]);
    expect(upstreamObserver).toHaveBeenCalledTimes(2);
    expect(downstreamObserver).toHaveBeenCalledTimes(2);
    expect(runtime.result(downstream)).toEqual({ revision: 1, value: 20 });

    const bailout = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 3)],
    });

    expect(bailout.outcome).toBe('committed');
    expect(upstreamUpdate).toHaveBeenCalledTimes(2);
    expect(runtime.result(upstream)).toEqual({ revision: 2, value: 2 });
    expect(runtime.result(downstream)).toEqual({ revision: 2, value: 20 });
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(fallbackDownstreamExecutions).toEqual([
      RuntimeComputationExecution.Full,
      RuntimeComputationExecution.Fallback,
    ]);
    expect(upstreamObserver).toHaveBeenCalledTimes(2);
    expect(downstreamObserver).toHaveBeenCalledTimes(2);
  });
});
