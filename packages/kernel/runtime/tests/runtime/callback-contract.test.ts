import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode, RuntimeDiagnosticCode } from '../../src';
import type { RuntimeComputationDefinitionInput, RuntimeComputationWarningInput } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { PerformanceTraceOutcome } from '../../src/trace';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineSource = () =>
  defineRuntimeSource<number, number, number, never>({
    key: 'counter',
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime callback contract', () => {
  it('创建时复制 updateStrategy，后续修改 options 不改变既有 Runtime', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const update = vi.fn((_previous, view) => ({
      kind: RuntimeComputationKind.Incremental,
      result: view.snapshot(owner).value,
    }));
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'immutable-strategy' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update,
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const options = {
      sources,
      computations,
      updateStrategy: 'auto' as 'auto' | 'full',
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    };
    const runtime = createRuntime(options);
    options.updateStrategy = 'full';

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }).outcome,
    ).toBe(RuntimeComputationKind.Incremental);
    expect(update).toHaveBeenCalledTimes(1);
  });

  it('创建时读取合法 updateStrategy getter 一次', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    let reads = 0;
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      get updateStrategy(): 'auto' {
        reads += 1;
        if (reads > 1) throw new Error('strategy replayed');
        return 'auto';
      },
    });
    runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(owner, 2)] });
    expect(reads).toBe(1);
    expect(runtime.snapshot(owner).value).toBe(2);
    runtime.dispose();
  });

  it.each(['run', 'incremental', 'fallback'] as const)('%s 返回值 getter 异常保留 cause 与失败阶段', mode => {
    const getterCause = new Error('callback result getter failed');
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      run: view => ({
        kind: RuntimeComputationKind.Full,
        get result(): number {
          if (mode === 'run') throw getterCause;
          return view.snapshot(owner).value;
        },
      }),
      update: () =>
        mode === 'fallback'
          ? {
              kind: RuntimeComputationKind.Fallback,
              get diagnostics(): ReadonlyArray<RuntimeComputationWarningInput> {
                throw getterCause;
              },
            }
          : {
              kind: RuntimeComputationKind.Incremental,
              get result(): number {
                throw getterCause;
              },
            },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const options = { sources, computations, initialSnapshots: [createRuntimeSourceInput(owner, 1)] };
    if (mode === 'run') {
      expect(() => createRuntime(options)).toThrowError(
        expect.objectContaining({
          code: RetikzRuntimeErrorCode.ComputationRunFailed,
          phase: 'run',
          cause: getterCause,
        }),
      );
      return;
    }
    const runtime = createRuntime(options);
    expect(() =>
      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(owner, 2)] }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        phase: 'update',
        cause: getterCause,
      }),
    );
    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(owner).value).toBe(1);
    expect(runtime.result(computation).value).toBe(1);
    runtime.dispose();
  });

  it('update result 只读取一次 author 属性，后续 getter throw 不会逃逸', () => {
    const getterCause = new Error('update kind getter replayed');
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    let kindReads = 0;
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: (view: Parameters<RuntimeComputationDefinitionInput<number, number, number, number>['run']>[0]) => ({
        kind: RuntimeComputationKind.Full,
        result: view.snapshot(owner).value,
      }),
      update: () => ({
        get kind(): typeof RuntimeComputationKind.Incremental {
          kindReads += 1;
          if (kindReads > 1) throw getterCause;
          return RuntimeComputationKind.Incremental;
        },
        result: 2,
      }),
    } satisfies RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
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
      }),
    ).toEqual(expect.objectContaining({ revision: 1, outcome: RuntimeComputationKind.Incremental }));
    expect(kindReads).toBe(1);
    expect(runtime.revision()).toBe(1);
  });

  it('context diagnostic 只读取一次 author 属性', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    let codeReads = 0;
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        const diagnostic = {
          get code(): string {
            codeReads += 1;
            if (codeReads > 1) throw new Error('warning replayed');
            return 'COMPUTATION_WARNING';
          },
          phase: 'run' as const,
          message: 'warning',
        };
        context.diagnose(diagnostic);

        return { kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(codeReads).toBe(1);
    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({ code: 'COMPUTATION_WARNING', severity: 'warning' }),
    ]);
  });

  it('Computation trace facade 不允许 callback drain reporter diagnostics', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [
        {
          phase: 'update',
          unit: 'computation',
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        context.trace.report({
          phase: 'update',
          unit: 'computation',
          outcome: PerformanceTraceOutcome.Full,
          visited: 0,
          reused: 1,
          changed: 0,
        });
        const drain = Reflect.get(context.trace, 'diagnostics');
        if (typeof drain === 'function') Reflect.apply(drain, context.trace, []);

        return { kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({ code: RuntimeDiagnosticCode.TraceInvalidRecord, severity: 'error' }),
    ]);
  });
});
