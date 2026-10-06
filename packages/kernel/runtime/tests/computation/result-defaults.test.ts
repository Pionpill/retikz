import { describe, expect, it } from 'vitest';

import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  defineRuntimeSource,
  defineRuntimeComputation,
  RetikzRuntimeErrorCode,
} from '../../src';

const counter = defineRuntimeSource<number, number, number, never>({
  key: 'counter',
  value: { capture: value => value, read: value => value, equals: (left, right) => left === right },
});

const sources = createRuntimeSourceRegistry([counter]);

describe('Computation result defaults', () => {
  it('省略配置后发布完整结果，并向增量更新和 observer 提供数值', () => {
    const observed: Array<number> = [];
    const computation = defineRuntimeComputation({
      id: { owner: 'counter', key: 'default' },
      sources: [counter],
      run: view => ({ kind: 'full', result: view.snapshot(counter).value * 2 }),
      update: (previous, view) => ({ kind: 'incremental', result: previous + view.snapshot(counter).value }),
      observeCommit: event => observed.push(event.result.value),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({ sources, computations, initialSnapshots: [createRuntimeSourceInput(counter, 1)] });

    try {
      expect(runtime.result(computation).value.toFixed()).toBe('2');

      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(counter, 3)] });

      expect(runtime.result(computation)).toEqual({ revision: 1, value: 5 });
      expect(observed).toEqual([2, 5]);
    } finally {
      runtime.dispose();
    }
  });

  it('独立应用 capture、private read 和 public read，省略的 read 始终读取内部 result', () => {
    const captured = defineRuntimeComputation<number, string>({
      id: { owner: 'counter', key: 'captured' },
      sources: [counter],
      result: { capture: value => `value:${value}` },
      run: view => ({ kind: 'full', result: view.snapshot(counter).value }),
    });
    const privateRead = defineRuntimeComputation<number, number, string>({
      id: { owner: 'counter', key: 'private' },
      sources: [counter],
      result: { readForComputation: value => String(value) },
      run: view => ({ kind: 'full', result: view.snapshot(counter).value }),
      update: previous => ({ kind: 'incremental', result: Number(previous) + 10 }),
    });
    const publicRead = defineRuntimeComputation<number, number, number, string>({
      id: { owner: 'counter', key: 'public' },
      sources: [counter],
      result: { read: value => `public:${value}` },
      run: view => ({ kind: 'full', result: view.snapshot(counter).value }),
      update: previous => ({ kind: 'incremental', result: previous + 20 }),
    });
    const computations = createRuntimeComputationRegistry({
      sources,
      computations: [captured, privateRead, publicRead],
    });
    const runtime = createRuntime({ sources, computations, initialSnapshots: [createRuntimeSourceInput(counter, 1)] });

    try {
      expect(runtime.result(captured).value).toBe('value:1');
      expect(runtime.result(privateRead).value.toFixed()).toBe('1');
      expect(runtime.result(publicRead).value).toBe('public:1');

      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(counter, 2)] });

      expect(runtime.result(captured).value).toBe('value:2');
      expect(runtime.result(privateRead).value).toBe(11);
      expect(runtime.result(publicRead).value).toBe('public:21');
    } finally {
      runtime.dispose();
    }
  });

  it('默认转换不复制或冻结引用，允许复用无 dispose 的不可变 result', () => {
    const value = { count: 1 };
    const computation = defineRuntimeComputation({
      id: { owner: 'counter', key: 'reference' },
      sources: [counter],
      result: {},
      run: () => ({ kind: 'full', result: value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({ sources, computations, initialSnapshots: [createRuntimeSourceInput(counter, 1)] });

    try {
      expect(runtime.result(computation).value).toBe(value);
      expect(Object.isFrozen(value)).toBe(false);

      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(counter, 2)] });

      expect(runtime.result(computation).value).toBe(value);
    } finally {
      runtime.dispose();
    }
  });

  it('仅提供 dispose 时仍拒绝 current alias，并在替换和退出时释放资源', () => {
    const first = { count: 1 };
    const second = { count: 2 };
    let candidate = first;
    const disposed: Array<{ count: number }> = [];
    const computation = defineRuntimeComputation<{ count: number }>({
      id: { owner: 'counter', key: 'resource' },
      sources: [counter],
      result: { dispose: value => disposed.push(value) },
      run: () => ({ kind: 'full', result: candidate }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({ sources, computations, initialSnapshots: [createRuntimeSourceInput(counter, 1)] });

    try {
      expect(() =>
        runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(counter, 2)] }),
      ).toThrow(expect.objectContaining({ code: RetikzRuntimeErrorCode.ResultOwnershipAlias }));
      expect(runtime.result(computation)).toEqual({ revision: 0, value: first });
      expect(disposed).toEqual([]);

      candidate = second;
      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(counter, 2)] });

      expect(disposed).toEqual([first]);
      expect(runtime.result(computation).value).toBe(second);
    } finally {
      runtime.dispose();
    }

    expect(disposed).toEqual([first, second]);
  });
});
