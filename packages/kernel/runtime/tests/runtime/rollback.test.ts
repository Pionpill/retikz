import { describe, expect, it } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

describe('runtime runtime rollback', () => {
  it('initial owner prepare 失败时反向释放此前已捕获 value', () => {
    const retired: Array<string> = [];
    const first = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`a:${value.value}`),
      },
    });
    const second = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'b',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`b:${value.value}`),
      },
    });
    const cause = new Error('capture failed');
    const third = defineRuntimeSource<number, number, number, never>({
      key: 'c',
      value: {
        capture: () => {
          throw cause;
        },
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([third, second, first]);
    const computations = createRuntimeComputationRegistry({ sources });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [
          createRuntimeSourceInput(first, 1),
          createRuntimeSourceInput(second, 2),
          createRuntimeSourceInput(third, 3),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.CaptureFailed, cause }));
    expect(retired).toEqual(['b:2', 'a:1']);
  });

  it('owner update prepare 失败时回滚此前 candidate，current 保持不变', () => {
    const retired: Array<string> = [];
    const first = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`a:${value.value}`),
      },
    });
    const cause = new Error('capture failed');
    const second = defineRuntimeSource<number, number, number, never>({
      key: 'b',
      value: {
        capture: value => {
          if (value === 2) throw cause;
          return value;
        },
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([second, first]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(first, 1), createRuntimeSourceInput(second, 1)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(first, 2), createRuntimeSourceUpdate(second, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.CaptureFailed, cause }));
    expect(retired).toEqual(['a:2']);
    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(first)).toEqual({ revision: 0, value: 1 });
    expect(runtime.snapshot(second)).toEqual({ revision: 0, value: 1 });
  });

  it('Computation prepare 失败时先反向释放 result，再反向释放 owner candidates', () => {
    const retired: Array<string> = [];
    const firstSource = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:a:${value.value}`),
      },
    });
    const secondSource = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'b',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:b:${value.value}`),
      },
    });
    const thirdSource = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'c',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => retired.push(`owner:c:${value.value}`),
      },
    });
    const sources = createRuntimeSourceRegistry([thirdSource, secondSource, firstSource]);
    const firstComputation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'a', key: 'computation' },
      sources: [firstSource],
      computations: [],
      tracePhases: [],
      result: {
        capture: value => ({ value }),
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: value => retired.push(`result:a:${value.value}`),
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(firstSource).value }),
      update: (_previous, view) => ({
        kind: RuntimeComputationKind.Incremental,
        result: view.snapshot(firstSource).value,
      }),
    });
    const secondComputation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'b', key: 'computation' },
      sources: [secondSource],
      computations: [],
      tracePhases: [],
      result: {
        capture: value => ({ value }),
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: value => retired.push(`result:b:${value.value}`),
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(secondSource).value }),
      update: (_previous, view) => ({
        kind: RuntimeComputationKind.Incremental,
        result: view.snapshot(secondSource).value,
      }),
    });
    const cause = new Error('downstream failed');
    const downstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'c', key: 'computation' },
      sources: [thirdSource],
      computations: [firstComputation, secondComputation],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(thirdSource).value }),
      update: () => {
        throw cause;
      },
    });
    const computations = createRuntimeComputationRegistry({
      sources,
      computations: [downstream, secondComputation, firstComputation],
    });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [
        createRuntimeSourceInput(firstSource, 1),
        createRuntimeSourceInput(secondSource, 1),
        createRuntimeSourceInput(thirdSource, 1),
      ],
    });
    retired.length = 0;

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [
          createRuntimeSourceUpdate(firstSource, 2),
          createRuntimeSourceUpdate(secondSource, 2),
          createRuntimeSourceUpdate(thirdSource, 2),
        ],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ComputationUpdateFailed, cause }));
    expect(retired).toEqual(['result:b:2', 'result:a:2', 'owner:c:2', 'owner:b:2', 'owner:a:2']);
    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(firstSource)).toEqual({ revision: 0, value: 1 });
    expect(runtime.snapshot(secondSource)).toEqual({ revision: 0, value: 1 });
    expect(runtime.snapshot(thirdSource)).toEqual({ revision: 0, value: 1 });
    expect(runtime.result(firstComputation)).toEqual({ revision: 0, value: 1 });
    expect(runtime.result(secondComputation)).toEqual({ revision: 0, value: 1 });
    expect(runtime.result(downstream)).toEqual({ revision: 0, value: 1 });
  });
});
