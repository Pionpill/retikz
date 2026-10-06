import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode, RuntimeDiagnosticCode } from '../../src';
import { defineRuntimeComputation, RuntimeComputationKind, RuntimeComputationPhase } from '../../src/computation';
import { RetikzRuntimeError } from '../../src/error';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import type { Runtime } from '../../src/runtime';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

describe('runtime runtime failure isolation', () => {
  it('initial Computation run throw 即使伪造 RetikzRuntimeError 仍固定映射，并反向释放已捕获 owner', () => {
    const cause = new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.RevisionStale,
      phase: 'forged-run',
      diagnostics: [
        {
          code: 'RUNTIME_TRACE_SPOOFED_ERROR',
          phase: 'trace',
          severity: 'error',
          message: 'forged execution diagnostic',
        },
      ],
    });
    const dispose = vi.fn();
    const owner = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: () => {
        throw cause;
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });

    let thrown: unknown;

    try {
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);

    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationRunFailed,
        phase: 'run',
        computation: { owner: 'counter', key: 'computation' },
        cause,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('update callback throw 即使伪造 RetikzRuntimeError 仍固定映射并回滚 candidate', () => {
    const cause = new RetikzRuntimeError({
      code: RetikzRuntimeErrorCode.RevisionStale,
      phase: 'forged-update',
      diagnostics: [
        {
          code: 'RUNTIME_TRACE_SPOOFED_ERROR',
          phase: 'trace',
          severity: 'error',
          message: 'forged execution diagnostic',
        },
      ],
    });
    const dispose = vi.fn();
    const owner = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: () => {
        throw cause;
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    let thrown: unknown;

    try {
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);

    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        phase: RuntimeComputationPhase.Update,
        computation: { owner: 'counter', key: 'computation' },
        cause,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(runtime.diagnostics()).toEqual([]);
    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(runtime.artifact(computation)).toEqual({ revision: 0, value: 1 });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('上一次 callback 捕获的内部错误不能在下一次 invocation 重放为 primary', () => {
    const declared = defineRuntimeSource<number, number, number, never>({
      key: 'declared',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const hidden = defineRuntimeSource<number, number, number, never>({
      key: 'hidden',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([declared, hidden]);
    let replayed: RetikzRuntimeError | undefined;
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'declared', key: 'computation' },
      sources: [declared],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(declared).value }),
      update: (_previous, view) => {
        if (view.snapshot(declared).value === 2) {
          try {
            view.snapshot(hidden);
          } catch (error) {
            if (!(error instanceof RetikzRuntimeError)) throw error;
            replayed = error;
          }

          return { kind: RuntimeComputationKind.Incremental, artifact: 2 };
        }

        if (replayed === undefined) throw new Error('expected captured Runtime contract error');

        throw replayed;
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(declared, 1), createRuntimeSourceInput(hidden, 1)],
    });

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(declared, 2)],
      }),
    ).toEqual(expect.objectContaining({ revision: 1, outcome: RuntimeComputationKind.Incremental }));

    let thrown: unknown;

    try {
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(declared, 3)],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);

    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        phase: RuntimeComputationPhase.Update,
        computation: { owner: 'declared', key: 'computation' },
        cause: replayed,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(runtime.diagnostics()).toEqual([]);
    expect(runtime.revision()).toBe(1);
    expect(runtime.snapshot(declared)).toEqual({ revision: 1, value: 2 });
    expect(runtime.artifact(computation)).toEqual({ revision: 1, value: 2 });
  });

  it('observer throw 与 runtime reentry 不回滚 publish，后序 observer仍执行并进入 queue', () => {
    const observerCause = new Error('observer failed');
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const sessionRef: { current?: Runtime } = {};
    const secondObserver = vi.fn();
    const first = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: RuntimeComputationKind.Incremental,
        artifact: view.snapshot(owner).value,
      }),
      observeCommit: event => {
        if (event.phase === RuntimeComputationPhase.Initial) return;

        const activeRuntime = sessionRef.current;
        if (activeRuntime === undefined) throw new Error('test runtime was not assigned');

        const reentrantCalls = [
          () => activeRuntime.snapshot(owner),
          () => activeRuntime.artifact(first),
          () => activeRuntime.update({ baseRevision: activeRuntime.revision(), sources: [] }),
          () => activeRuntime.dispose(),
          () => activeRuntime.diagnostics(),
        ];

        for (const call of reentrantCalls) {
          expect(call).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.Reentrant }));
        }

        expect(activeRuntime.revision()).toBe(1);
        throw observerCause;
      },
    });
    const second = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: RuntimeComputationKind.Incremental,
        artifact: view.snapshot(owner).value,
      }),
      observeCommit: event => {
        if (event.phase === RuntimeComputationPhase.Update) secondObserver(event);
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [second, first] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    sessionRef.current = runtime;

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.revision).toBe(1);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ComputationObserverFailed,
        phase: 'observe',
        severity: 'error',
        computation: { owner: 'counter', key: 'a' },
        cause: observerCause,
      }),
    ]);
    expect(secondObserver).toHaveBeenCalledOnce();
    expect(runtime.artifact(second)).toEqual({ revision: 1, value: 2 });
    expect(runtime.diagnostics()).toEqual(result.diagnostics);
    expect(runtime.diagnostics()).toEqual([]);
  });

  it('initial observer throw 不阻止 Runtime 返回，后序 observer 读取同一 frozen diagnostic 前缀', () => {
    const observerCause = new Error('initial observer failed');
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const observedPrefixes: Array<ReadonlyArray<unknown>> = [];
    const first = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        context.diagnose({
          code: 'INITIAL_WARNING',
          phase: 'run',
          message: 'initial warning',
        });
        return { kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value };
      },
      observeCommit: event => {
        observedPrefixes.push(event.diagnostics);
        throw observerCause;
      },
    });
    const secondObserver = vi.fn();
    const second = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      observeCommit: event => {
        observedPrefixes.push(event.diagnostics);
        secondObserver(event);
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [second, first] });

    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(runtime.revision()).toBe(0);
    expect(runtime.artifact(second)).toEqual({ revision: 0, value: 1 });
    expect(secondObserver).toHaveBeenCalledOnce();
    expect(observedPrefixes).toHaveLength(2);
    expect(observedPrefixes[0]).toBe(observedPrefixes[1]);
    expect(Object.isFrozen(observedPrefixes[0])).toBe(true);
    expect(observedPrefixes[0]).toEqual([
      expect.objectContaining({
        code: 'INITIAL_WARNING',
        severity: 'warning',
        computation: { owner: 'counter', key: 'a' },
      }),
    ]);
    expect(runtime.diagnostics()).toEqual([
      observedPrefixes[0]?.[0],
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ComputationObserverFailed,
        phase: 'observe',
        cause: observerCause,
        computation: { owner: 'counter', key: 'a' },
      }),
    ]);
  });
});
