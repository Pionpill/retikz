import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode, RuntimeDiagnosticCode } from '../../src';
import type { RuntimeComputationDefinitionInput } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind, RuntimeComputationPhase } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { PerformanceTraceOutcome, PerformanceTracePhase, PerformanceTraceUnit } from '../../src/trace';
import type { RuntimeUpdate } from '../../src/transaction';
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

describe('runtime runtime malformed JavaScript input', () => {
  it('runtime options null/foreign registry 不泄漏原生错误', () => {
    const create = createRuntime as (value: unknown) => unknown;

    expect(() => create(null)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.RegistryMismatch, phase: 'runtime-create' }),
    );
    expect(() => create({ sources: {}, computations: {} })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.RegistryMismatch, phase: 'runtime-create' }),
    );
  });

  it('拒绝未知 updateStrategy，不把非法策略静默当成 auto', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const create = createRuntime as (value: unknown) => unknown;

    expect(() =>
      create({
        sources,
        computations,
        updateStrategy: 'incremental',
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.UpdateStrategyInvalid,
        phase: 'runtime-create',
      }),
    );
  });

  it('创建时复制 updateStrategy，后续修改 options 不改变既有 Runtime', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const update = vi.fn((_previous, view) => ({
      kind: RuntimeComputationKind.Incremental,
      artifact: view.snapshot(owner).value,
    }));
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'immutable-strategy' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update,
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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

  it('拒绝 updateStrategy accessor，避免创建阶段执行外部 getter', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const create = createRuntime as (value: unknown) => unknown;
    const getter = vi.fn(() => 'auto');
    const options = Object.defineProperty(
      {
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      },
      'updateStrategy',
      { enumerable: true, get: getter },
    );

    expect(() => create(options)).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.UpdateStrategyInvalid,
        phase: 'runtime-create',
      }),
    );
    expect(getter).not.toHaveBeenCalled();
  });

  it('update null/primitive 不泄漏 TypeError', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    const update = runtime.update as (value: unknown) => unknown;

    expect(() => update(null)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.RevisionInvalid, phase: RuntimeComputationPhase.Update }),
    );
    expect(() => update('invalid')).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.RevisionInvalid, phase: RuntimeComputationPhase.Update }),
    );
  });

  it('拒绝 malformed full run result，并保留 Computation context', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: () => null,
    } as unknown as RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationRunFailed,
        phase: 'run',
        computation: { owner: 'counter', key: 'computation' },
        cause: null,
      }),
    );
  });

  it('run result 的恶意 getter throw 仍映射为稳定 Computation error', () => {
    const getterCause = new Error('run kind getter failed');
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: () =>
        Object.defineProperty({}, 'kind', {
          get: () => {
            throw getterCause;
          },
        }),
    } as unknown as RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationRunFailed,
        phase: 'run',
        cause: getterCause,
      }),
    );
  });

  it('update result 只读取一次 author 属性，后续 getter throw 不会逃逸', () => {
    const getterCause = new Error('update kind getter replayed');
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    let kindReads = 0;
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: (view: Parameters<RuntimeComputationDefinitionInput<number, number, number, number>['run']>[0]) => ({
        kind: RuntimeComputationKind.Full,
        artifact: view.snapshot(owner).value,
      }),
      update: () =>
        Object.defineProperties(
          {},
          {
            kind: {
              get: () => {
                kindReads += 1;
                if (kindReads > 1) throw getterCause;
                return 'incremental';
              },
            },
            artifact: { value: 2 },
          },
        ),
    } as unknown as RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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

  it.each([
    { name: 'unknown kind', result: { kind: 'unknown' } },
    { name: 'malformed fallback diagnostics', result: { kind: RuntimeComputationKind.Fallback, diagnostics: [null] } },
  ])('拒绝 $name update result，不把它误判为合法 fallback', testCase => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: (view: Parameters<RuntimeComputationDefinitionInput<number, number, number, number>['run']>[0]) => ({
        kind: RuntimeComputationKind.Full,
        artifact: view.snapshot(owner).value,
      }),
      update: () => testCase.result,
    } as unknown as RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        phase: RuntimeComputationPhase.Update,
        computation: { owner: 'counter', key: 'computation' },
        cause: testCase.result,
      }),
    );
    expect(runtime.revision()).toBe(0);
  });

  it('缺少 sources 的 update envelope 使用稳定 command error', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    const malformed = { baseRevision: runtime.revision() } as unknown as RuntimeUpdate;

    expect(() => runtime.update(malformed)).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.SourceCommandInvalid,
        phase: RuntimeComputationPhase.Update,
      }),
    );
  });

  it('拒绝 malformed context diagnostic，不提交不完整 warning', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const input = {
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: (value: number) => value,
        readForComputation: (value: number) => value,
        read: (value: number) => value,
      },
      run: view => ({
        kind: RuntimeComputationKind.Full,
        artifact: view.snapshot(owner).value,
      }),
      update: (_previous, _view, context) => {
        const diagnose = context.diagnose as (value: unknown) => void;
        diagnose({ code: 'BROKEN', phase: RuntimeComputationPhase.Update });
        return { kind: RuntimeComputationKind.Bailout };
      },
    } satisfies RuntimeComputationDefinitionInput<number, number, number, number>;
    const computation = defineRuntimeComputation(input);
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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
    ).toThrowError(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        phase: RuntimeComputationPhase.Update,
      }),
    );
    expect(runtime.diagnostics()).toEqual([]);
  });

  it('context diagnostic 只读取一次 author 属性', () => {
    const owner = defineSource();
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    let codeReads = 0;
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        const diagnostic = Object.defineProperties(
          {},
          {
            code: { get: () => (++codeReads === 1 ? 'COMPUTATION_WARNING' : null), enumerable: true },
            phase: { value: 'run', enumerable: true },
            message: { value: 'warning', enumerable: true },
          },
        ) as Readonly<{ code: string; phase: 'run'; message: string }>;
        context.diagnose(diagnostic);

        return { kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [
        {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcomes: [PerformanceTraceOutcome.Full],
        },
      ],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: (view, context) => {
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Full,
          visited: 0,
          reused: 1,
          changed: 0,
        });
        const drain = Reflect.get(context.trace, 'diagnostics');
        if (typeof drain === 'function') Reflect.apply(drain, context.trace, []);

        return { kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
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
