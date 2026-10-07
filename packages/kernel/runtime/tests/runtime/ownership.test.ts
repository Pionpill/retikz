import { describe, expect, it, vi } from 'vitest';

import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

describe('runtime runtime ownership', () => {
  it('equal candidate、已替换 current 与最终 current 均 exactly-once dispose', () => {
    const capturedSources: Array<Readonly<{ value: number }>> = [];
    const capturedResults: Array<Readonly<{ value: number }>> = [];
    const ownerDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const resultDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const owner = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedSources.push(captured);
          return captured;
        },
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: ownerDispose,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedResults.push(captured);
          return captured;
        },
        readForComputation: result => result.value,
        read: result => result.value,
        dispose: resultDispose,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: RuntimeComputationKind.Incremental,
        result: view.snapshot(owner).value,
      }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 1)],
      }).outcome,
    ).toBe(RuntimeComputationKind.Bailout);
    expect(ownerDispose).toHaveBeenCalledTimes(1);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedSources[1]);
    expect(resultDispose).not.toHaveBeenCalled();

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }).outcome,
    ).toBe(RuntimeComputationKind.Incremental);
    expect(ownerDispose).toHaveBeenCalledTimes(2);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedSources[1]);
    expect(ownerDispose.mock.calls.at(1)?.[0]).toBe(capturedSources[0]);
    expect(resultDispose).toHaveBeenCalledTimes(1);
    expect(resultDispose.mock.calls.at(0)?.[0]).toBe(capturedResults[0]);

    runtime.dispose();
    runtime.dispose();

    expect(ownerDispose).toHaveBeenCalledTimes(3);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedSources[1]);
    expect(ownerDispose.mock.calls.at(1)?.[0]).toBe(capturedSources[0]);
    expect(ownerDispose.mock.calls.at(2)?.[0]).toBe(capturedSources[2]);
    expect(resultDispose).toHaveBeenCalledTimes(2);
    expect(resultDispose.mock.calls.at(0)?.[0]).toBe(capturedResults[0]);
    expect(resultDispose.mock.calls.at(1)?.[0]).toBe(capturedResults[1]);
  });

  it('fallback full result 替换后释放旧值，runtime dispose 释放新值', () => {
    const capturedResults: Array<Readonly<{ value: number }>> = [];
    const resultDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedResults.push(captured);
          return captured;
        },
        readForComputation: result => result.value,
        read: result => result.value,
        dispose: resultDispose,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: () => ({ kind: RuntimeComputationKind.Fallback }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }).outcome,
    ).toBe(RuntimeComputationKind.Fallback);
    expect(resultDispose).toHaveBeenCalledTimes(1);
    expect(resultDispose.mock.calls.at(0)?.[0]).toBe(capturedResults[0]);
    expect(runtime.result(computation)).toEqual({ revision: 1, value: 2 });

    runtime.dispose();

    expect(resultDispose).toHaveBeenCalledTimes(2);
    expect(resultDispose.mock.calls.at(1)?.[0]).toBe(capturedResults[1]);
  });
});
