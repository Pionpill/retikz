import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import type { RuntimeComputationResultDefinitionInput } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineSource = (dispose = vi.fn()) =>
  defineRuntimeSource<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
    key: 'counter',
    value: {
      capture: input => input,
      read: input => input.value,
      equals: (left, right) => left.value === right.value,
      dispose,
    },
  });

type Result = Readonly<{ value: number }>;

type ResultDefinition = RuntimeComputationResultDefinitionInput<number, Result, number, number>;

describe('runtime Computation result lifecycle', () => {
  const failureCases: ReadonlyArray<{
    name: string;
    expectedCode: string;
    expectedPhase: string;
    result: (cause: Error, dispose: (result: Result) => void) => ResultDefinition;
    expectedDisposeCount: number;
  }> = [
    {
      name: 'capture',
      expectedCode: RetikzRuntimeErrorCode.ResultCaptureFailed,
      expectedPhase: 'result-capture',
      result: (cause: Error, dispose: (result: Result) => void) => ({
        capture: () => {
          throw cause;
        },
        readForComputation: (value: Readonly<{ value: number }>) => value.value,
        read: (value: Readonly<{ value: number }>) => value.value,
        dispose,
      }),
      expectedDisposeCount: 0,
    },
    {
      name: 'private read',
      expectedCode: RetikzRuntimeErrorCode.ResultComputationReadFailed,
      expectedPhase: 'result-computation-read',
      result: (cause: Error, dispose: (result: Result) => void) => ({
        capture: (value: number) => Object.freeze({ value }),
        readForComputation: () => {
          throw cause;
        },
        read: (value: Readonly<{ value: number }>) => value.value,
        dispose,
      }),
      expectedDisposeCount: 1,
    },
    {
      name: 'public read',
      expectedCode: RetikzRuntimeErrorCode.ResultPublicReadFailed,
      expectedPhase: 'result-public-read',
      result: (cause: Error, dispose: (result: Result) => void) => ({
        capture: (value: number) => Object.freeze({ value }),
        readForComputation: (value: Readonly<{ value: number }>) => value.value,
        read: () => {
          throw cause;
        },
        dispose,
      }),
      expectedDisposeCount: 1,
    },
  ];

  it.each(failureCases)('$name failure 使用稳定 code 并释放已捕获资源', testCase => {
    const cause = new Error(`${testCase.name} failed`);
    const ownerDispose = vi.fn();
    const resultDispose = vi.fn<(result: Result) => void>();
    const owner = defineSource(ownerDispose);
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: testCase.result(cause, resultDispose),
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, Object.freeze({ value: 1 }))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: testCase.expectedCode,
        phase: testCase.expectedPhase,
        computation: { owner: 'counter', key: 'computation' },
        cause,
      }),
    );
    expect(resultDispose).toHaveBeenCalledTimes(testCase.expectedDisposeCount);
    expect(ownerDispose).toHaveBeenCalledOnce();
  });

  it('owner capture alias fail-loud 且不释放仍在使用的 current value', () => {
    const shared = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    const owner = defineSource(ownerDispose);
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, shared)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceOwnershipAlias }));
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(ownerDispose).not.toHaveBeenCalled();
  });

  it('owner capture alias 在 read 前 fail-loud，read throw 不会释放 current value', () => {
    const shared: Readonly<{ value: number }> = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    let readCount = 0;
    const owner = defineRuntimeSource<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: input => input,
        read: value => {
          readCount += 1;
          if (readCount > 1) throw new Error('candidate read must not run');
          return value.value;
        },
        equals: (left, right) => left.value === right.value,
        dispose: ownerDispose,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, shared)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceOwnershipAlias }));
    expect(readCount).toBe(1);
    expect(ownerDispose).not.toHaveBeenCalled();
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
  });

  it('result capture alias fail-loud 且不释放仍在使用的 current result', () => {
    const sharedResult = Object.freeze({ value: 1 });
    const resultDispose = vi.fn();
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, typeof sharedResult, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: {
        capture: () => sharedResult,
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: resultDispose,
      },
      run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
      update: () => ({ kind: RuntimeComputationKind.Incremental, result: 2 }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ResultOwnershipAlias }));
    expect(runtime.result(computation)).toEqual({ revision: 0, value: 1 });
    expect(resultDispose).not.toHaveBeenCalled();
  });

  it('result capture alias 在双层 read 前 fail-loud，read throw 不会释放 current result', () => {
    const sharedResult = Object.freeze({ value: 1 });
    const resultDispose = vi.fn();
    let computationReadCount = 0;
    let publicReadCount = 0;
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, typeof sharedResult, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: {
        capture: () => sharedResult,
        readForComputation: value => {
          computationReadCount += 1;
          if (computationReadCount > 1) throw new Error('candidate Computation read must not run');
          return value.value;
        },
        read: value => {
          publicReadCount += 1;
          if (publicReadCount > 1) throw new Error('candidate public read must not run');
          return value.value;
        },
        dispose: resultDispose,
      },
      run: () => ({ kind: RuntimeComputationKind.Full, result: 1 }),
      update: () => ({ kind: RuntimeComputationKind.Incremental, result: 2 }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ResultOwnershipAlias }));
    expect(computationReadCount).toBe(1);
    expect(publicReadCount).toBe(1);
    expect(resultDispose).not.toHaveBeenCalled();
    expect(runtime.result(computation)).toEqual({ revision: 0, value: 1 });
  });
});
