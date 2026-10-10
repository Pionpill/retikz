import { describe, expect, it } from 'vitest';

import { defineRuntimeCommitParticipant, RetikzRuntimeErrorCode, RuntimeDiagnosticCode } from '../../src';
import type { RuntimeCommitEvent, RuntimeComputationTraceReporter } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind, RuntimeComputationPhase } from '../../src/computation';
import { RetikzRuntimeError } from '../../src/error';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import type { Runtime } from '../../src/runtime';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { PerformanceTraceOutcome, PerformanceTracePhase, PerformanceTraceUnit } from '../../src/trace';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const tracePhases = [
  {
    phase: PerformanceTracePhase.Update,
    unit: PerformanceTraceUnit.Computation,
    outcomes: [PerformanceTraceOutcome.Incremental],
  },
];

describe('runtime runtime diagnostics', () => {
  it('映射 trace diagnostic，并向所有 observer 提供同一 frozen commit-safe prefix', () => {
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
    const observedPrefixes: Array<RuntimeCommitEvent<number>['diagnostics']> = [];
    const first = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      sources: [owner],
      computations: [],
      tracePhases,
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        const invalidRecord = {
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 0,
          reused: 1,
          changed: 0,
        } as const;
        context.trace.report(invalidRecord);
        context.trace.report(invalidRecord);

        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
      observeCommit: event => {
        if (event.phase === RuntimeComputationPhase.Initial) return;
        observedPrefixes.push(event.diagnostics);
        throw observerCause;
      },
    });
    const second = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value }),
      observeCommit: event => {
        if (event.phase === RuntimeComputationPhase.Update) observedPrefixes.push(event.diagnostics);
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [second, first] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.TraceInvalidRecord,
        phase: 'trace',
        severity: 'error',
        owner: 'counter',
        computation: { owner: 'counter', key: 'a' },
      }),
      expect.objectContaining({
        code: RuntimeDiagnosticCode.TraceInvalidRecord,
        phase: 'trace',
        severity: 'error',
        owner: 'counter',
        computation: { owner: 'counter', key: 'a' },
      }),
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ComputationObserverFailed,
        phase: 'observe',
        cause: observerCause,
      }),
    ]);
    expect(observedPrefixes).toHaveLength(2);
    expect(observedPrefixes[0]).toBe(observedPrefixes[1]);
    expect(Object.isFrozen(observedPrefixes[0])).toBe(true);
    expect(observedPrefixes[0]).toEqual([result.diagnostics[0], result.diagnostics[1]]);
    expect(result.diagnostics[0]).toEqual(result.diagnostics[1]);
    expect(result.diagnostics[0]).not.toBe(result.diagnostics[1]);
    expect(Object.isFrozen(result.diagnostics)).toBe(true);
    expect(result.diagnostics.every(Object.isFrozen)).toBe(true);

    const queuedDiagnostics = runtime.diagnostics();

    expect(queuedDiagnostics).toEqual(result.diagnostics);
    expect(queuedDiagnostics).not.toBe(result.diagnostics);
    expect(Object.isFrozen(queuedDiagnostics)).toBe(true);
    expect(queuedDiagnostics.every(Object.isFrozen)).toBe(true);

    for (const [index, diagnostic] of queuedDiagnostics.entries()) {
      expect(diagnostic).toBe(result.diagnostics[index]);
    }
  });

  it('失败 update 丢弃 product warning，保留 trace 与 rollback diagnostics 到 error/queue', () => {
    const updateCause = new Error('downstream update failed');
    const disposeCause = new Error('candidate dispose failed');
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    let resultCaptureCount = 0;
    const upstream = defineRuntimeComputation<number, Readonly<{ value: number; candidate: boolean }>, number, number>({
      id: { owner: 'counter', key: 'a' },
      sources: [owner],
      computations: [],
      tracePhases,
      result: {
        capture: value => {
          resultCaptureCount += 1;
          return Object.freeze({ value, candidate: resultCaptureCount > 1 });
        },
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: value => {
          if (value.candidate) throw disposeCause;
        },
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        const diagnose = context.diagnose as (diagnostic: unknown) => void;
        diagnose({
          code: RuntimeDiagnosticCode.TraceInvalidRecord,
          phase: 'trace',
          message: 'discard me',
          severity: 'error',
          owner: 'spoofed-owner',
          computation: { owner: 'spoofed-owner', key: 'spoofed-computation' },
        });
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 0,
          reused: 1,
          changed: 0,
        });

        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const downstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      sources: [],
      computations: [upstream],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.result(upstream).value }),
      update: () => {
        throw updateCause;
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [downstream, upstream] });
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
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ComputationUpdateFailed,
        cause: updateCause,
        diagnostics: [
          expect.objectContaining({ code: RuntimeDiagnosticCode.TraceInvalidRecord }),
          expect.objectContaining({
            code: RuntimeDiagnosticCode.ResultDisposeFailed,
            cause: disposeCause,
          }),
        ],
      }),
    );
    expect(thrown).toBeInstanceOf(RetikzRuntimeError);

    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');

    expect(runtime.revision()).toBe(0);
    expect(runtime.result(upstream)).toEqual({ revision: 0, value: 1 });

    const queuedDiagnostics = runtime.diagnostics();

    expect(queuedDiagnostics).toEqual(thrown.diagnostics);
    expect(queuedDiagnostics).not.toBe(thrown.diagnostics);
    expect(queuedDiagnostics).toHaveLength(2);
    expect(queuedDiagnostics[0]).toBe(thrown.diagnostics[0]);
    expect(queuedDiagnostics[1]).toBe(thrown.diagnostics[1]);
    expect(runtime.diagnostics()).toEqual([]);
  });

  it('统一注入 context 与 fallback warning 归属，额外字段不改变分类', () => {
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    let updates = 0;
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        updates += 1;
        const spoofedWarning = {
          code: updates === 1 ? 'CONTEXT_WARNING' : 'FALLBACK_WARNING',
          phase: RuntimeComputationPhase.Update,
          message: 'Runtime must inject attribution',
          severity: 'error',
          owner: 'spoofed-owner',
          computation: { owner: 'spoofed-owner', key: 'spoofed-computation' },
        };
        if (updates === 1) {
          context.diagnose(spoofedWarning);
          return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
        }

        return {
          kind: RuntimeComputationKind.Fallback,
          diagnostics: [spoofedWarning],
        };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const contextResult = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(contextResult.diagnostics).toEqual([
      {
        code: 'CONTEXT_WARNING',
        phase: RuntimeComputationPhase.Update,
        severity: 'warning',
        message: 'Runtime must inject attribution',
        owner: 'counter',
        computation: { owner: 'counter', key: 'computation' },
      },
    ]);

    runtime.diagnostics();

    const fallbackResult = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 3)],
    });

    expect(fallbackResult.outcome).toBe(RuntimeComputationKind.Fallback);
    expect(fallbackResult.diagnostics).toEqual([
      {
        code: 'FALLBACK_WARNING',
        phase: RuntimeComputationPhase.Update,
        severity: 'warning',
        message: 'Runtime must inject attribution',
        owner: 'counter',
        computation: { owner: 'counter', key: 'computation' },
      },
    ]);
  });

  it('dispose 阶段阻止 reentry，并把 cleanup throw 留在 disposed runtime queue', () => {
    const sessionRef: { current?: Runtime } = {};
    const reentryErrors: Array<RetikzRuntimeError> = [];
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: () => {
          const activeRuntime = sessionRef.current;
          if (activeRuntime === undefined) return;

          const captureReentry = (action: () => unknown) => {
            try {
              action();
            } catch (cause) {
              if (!(cause instanceof RetikzRuntimeError)) throw cause;
              reentryErrors.push(cause);
            }
          };

          expect(activeRuntime.revision()).toBe(0);

          captureReentry(() => activeRuntime.snapshot(owner));
          captureReentry(() => activeRuntime.result(computation));
          captureReentry(() =>
            activeRuntime.update({
              baseRevision: activeRuntime.revision(),
              sources: [createRuntimeSourceUpdate(owner, 2)],
            }),
          );
          captureReentry(() => activeRuntime.diagnostics());
          captureReentry(() => activeRuntime.dispose());
          throw reentryErrors[0];
        },
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    sessionRef.current = runtime;

    expect(() => runtime.dispose()).not.toThrow();
    expect(reentryErrors.map(error => [error.code, error.phase])).toEqual([
      [RetikzRuntimeErrorCode.Reentrant, 'snapshot'],
      [RetikzRuntimeErrorCode.Reentrant, 'result'],
      [RetikzRuntimeErrorCode.Reentrant, 'update'],
      [RetikzRuntimeErrorCode.Reentrant, 'diagnostics'],
      [RetikzRuntimeErrorCode.Reentrant, 'dispose'],
    ]);
    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.SourceDisposeFailed,
        severity: 'error',
        owner: 'counter',
        cause: expect.objectContaining({ code: RetikzRuntimeErrorCode.Reentrant }),
      }),
    ]);
  });

  it('dispose 按反向 Computation/Source 顺序继续清理，重复调用不重复释放', () => {
    const cleanupOrder: Array<string> = [];
    const ownerA = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'a',
      value: {
        capture: value => Object.freeze({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: () => {
          cleanupOrder.push('owner:a');
          throw new Error('owner a dispose failed');
        },
      },
    });
    const ownerB = defineRuntimeSource<number, Readonly<{ value: number }>, number, never>({
      key: 'b',
      value: {
        capture: value => Object.freeze({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: () => {
          cleanupOrder.push('owner:b');
          throw new Error('owner b dispose failed');
        },
      },
    });
    const sources = createRuntimeSourceRegistry([ownerB, ownerA]);
    const computationA = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'a', key: 'derive' },
      sources: [ownerA],
      computations: [],
      tracePhases: [],
      result: {
        capture: value => Object.freeze({ value }),
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: () => {
          cleanupOrder.push('computation:a');
          throw new Error('computation a dispose failed');
        },
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(ownerA).value }),
    });
    const computationB = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'b', key: 'derive' },
      sources: [ownerB],
      computations: [computationA],
      tracePhases: [],
      result: {
        capture: value => Object.freeze({ value }),
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: () => {
          cleanupOrder.push('computation:b');
          throw new Error('computation b dispose failed');
        },
      },
      run: view => ({
        kind: RuntimeComputationKind.Full,
        result: view.result(computationA).value + view.snapshot(ownerB).value,
      }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computationB, computationA] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(ownerB, 2), createRuntimeSourceInput(ownerA, 1)],
    });

    runtime.dispose();
    runtime.dispose();

    expect(cleanupOrder).toEqual(['computation:b', 'computation:a', 'owner:b', 'owner:a']);
    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ResultDisposeFailed,
        computation: { owner: 'b', key: 'derive' },
      }),
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ResultDisposeFailed,
        computation: { owner: 'a', key: 'derive' },
      }),
      expect.objectContaining({ code: RuntimeDiagnosticCode.SourceDisposeFailed, owner: 'b' }),
      expect.objectContaining({ code: RuntimeDiagnosticCode.SourceDisposeFailed, owner: 'a' }),
    ]);
    expect(runtime.diagnostics()).toEqual([]);
  });

  it.each([
    {
      name: 'sink throw',
      expectedCode: RuntimeDiagnosticCode.TraceSinkFailed,
      createSink: () => () => {
        throw new Error('sink failed');
      },
    },
    {
      name: 'reentrant report',
      expectedCode: RuntimeDiagnosticCode.TraceReentrant,
      createSink: (readReporter: () => RuntimeComputationTraceReporter | undefined) => () => {
        readReporter()?.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 1,
          reused: 0,
          changed: 1,
        });
      },
    },
  ])('映射 $name reporter diagnostic', testCase => {
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    let activeReporter: RuntimeComputationTraceReporter | undefined;
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases,
      result: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        activeReporter = context.trace;
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 1,
          reused: 0,
          changed: 1,
        });

        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      trace: testCase.createSink(() => activeReporter),
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: testCase.expectedCode,
        phase: 'trace',
        computation: { owner: 'counter', key: 'computation' },
      }),
    ]);
  });

  it('semantic-equal candidate dispose failure 随 bailout result 与 queue 返回', () => {
    const disposeCause = new Error('equal candidate dispose failed');
    let captures = 0;
    const owner = defineRuntimeSource<number, Readonly<{ value: number; candidate: boolean }>, number, never>({
      key: 'counter',
      value: {
        capture: value => {
          captures += 1;
          return Object.freeze({ value, candidate: captures > 1 });
        },
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => {
          if (value.candidate) throw disposeCause;
        },
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 1)],
    });

    expect(result).toEqual({
      revision: 0,
      outcome: RuntimeComputationKind.Bailout,
      diagnostics: [
        expect.objectContaining({
          code: RuntimeDiagnosticCode.SourceDisposeFailed,
          cause: disposeCause,
        }),
      ],
    });
    expect(runtime.diagnostics()).toEqual(result.diagnostics);
  });

  it('后序 Source prepare 失败时保留此前 equal candidate cleanup diagnostic 到 error/queue', () => {
    const disposeCause = new Error('equal candidate dispose failed');
    const captureCause = new Error('later owner capture failed');
    let firstCaptures = 0;
    const first = defineRuntimeSource<number, Readonly<{ value: number; candidate: boolean }>, number, never>({
      key: 'a',
      value: {
        capture: value => {
          firstCaptures += 1;
          return Object.freeze({ value, candidate: firstCaptures > 1 });
        },
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: value => {
          if (value.candidate) throw disposeCause;
        },
      },
    });
    let secondCaptures = 0;
    const second = defineRuntimeSource<number, number, number, never>({
      key: 'b',
      value: {
        capture: value => {
          secondCaptures += 1;
          if (secondCaptures > 1) throw captureCause;
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
      initialSnapshots: [createRuntimeSourceInput(second, 1), createRuntimeSourceInput(first, 1)],
    });

    let thrown: unknown;

    try {
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(first, 1), createRuntimeSourceUpdate(second, 2)],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.CaptureFailed,
        cause: captureCause,
        diagnostics: [
          expect.objectContaining({
            code: RuntimeDiagnosticCode.SourceDisposeFailed,
            owner: 'a',
            cause: disposeCause,
          }),
        ],
      }),
    );
    expect(thrown).toBeInstanceOf(RetikzRuntimeError);

    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');

    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(first)).toEqual({ revision: 0, value: 1 });
    expect(runtime.snapshot(second)).toEqual({ revision: 0, value: 1 });

    const queuedDiagnostics = runtime.diagnostics();

    expect(queuedDiagnostics).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.SourceDisposeFailed,
        owner: 'a',
        cause: disposeCause,
      }),
    ]);
    expect(thrown.diagnostics[0]).toBe(queuedDiagnostics[0]);
    expect(Object.isFrozen(thrown.diagnostics)).toBe(true);
    expect(Object.isFrozen(thrown.diagnostics[0])).toBe(true);
    expect(runtime.diagnostics()).toEqual([]);
  });

  it('result prepare failure 保留同 callback 的 trace diagnostics', () => {
    const captureCause = new Error('candidate result capture failed');
    let captures = 0;
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases,
      result: {
        capture: value => {
          captures += 1;
          if (captures > 1) throw captureCause;
          return value;
        },
        readForComputation: value => value,
        read: value => value,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        context.trace.report({
          phase: PerformanceTracePhase.Update,
          unit: PerformanceTraceUnit.Computation,
          outcome: PerformanceTraceOutcome.Incremental,
          visited: 0,
          reused: 1,
          changed: 0,
        });
        return { kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value };
      },
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
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
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: RetikzRuntimeErrorCode.ResultCaptureFailed,
        cause: captureCause,
        diagnostics: [expect.objectContaining({ code: RuntimeDiagnosticCode.TraceInvalidRecord })],
      }),
    );
    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({ code: RuntimeDiagnosticCode.TraceInvalidRecord }),
    ]);
  });

  it.each(['source', 'result', 'observer', 'participant'])('不可转成文本的 $0 异常不打断更新或后序释放', boundary => {
    const cause = Object.create(null);
    const cleanup: Array<string> = [];
    let shouldFail = false;
    const define = (key: string) =>
      defineRuntimeSource<number, number, number, never>({
        key,
        value: {
          capture: value => value,
          read: value => value,
          equals: (left, right) => left === right,
          dispose: value => {
            cleanup.push(`${key}:${value}`);
            if (shouldFail && boundary === 'source' && key === 'b') throw cause;
          },
        },
      });
    const a = define('a');
    const b = define('b');
    const sources = createRuntimeSourceRegistry([a, b]);
    const computation = defineRuntimeComputation<number>({
      id: { owner: 'a', key: 'value' },
      sources: [a],
      run: view => ({ kind: 'full', result: view.snapshot(a).value }),
      observeCommit: () => {
        if (shouldFail && boundary === 'observer') throw cause;
      },
      result: {
        dispose: value => {
          cleanup.push(`result:${value}`);
          if (shouldFail && boundary === 'result') throw cause;
        },
      },
    });
    const participant = defineRuntimeCommitParticipant({
      key: 'participant',
      sources: [a],
      revisionPolicy: 'continuous',
      prepare: () => ({
        commit: () => undefined,
        rollback: () => undefined,
        dispose: () => {
          cleanup.push('token');
          if (shouldFail && boundary === 'participant') throw cause;
        },
      }),
      read: () => 1,
      dispose: () => undefined,
    });
    const runtime = createRuntime({
      sources,
      computations: createRuntimeComputationRegistry({ sources, computations: [computation] }),
      initialSnapshots: [createRuntimeSourceInput(a, 1), createRuntimeSourceInput(b, 1)],
      participants: [participant],
    });
    cleanup.length = 0;
    shouldFail = true;
    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(a, 2), createRuntimeSourceUpdate(b, 2)],
    });
    expect(result.revision).toBe(1);
    expect(runtime.result(computation).value).toBe(2);
    expect(cleanup).toEqual(['result:1', 'b:1', 'a:1', 'token']);
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].cause).toBe(cause);
    expect(result.diagnostics[0].message.length).toBeGreaterThan(0);
    shouldFail = false;
    runtime.dispose();
  });

  it('清理异常的 message getter 失败不覆盖初始化的主要读取异常', () => {
    const primary = new Error('read failed');
    const secondary = Object.defineProperty(new Error(), 'message', {
      get: () => {
        throw new Error('message failed');
      },
    });
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: () => {
          throw primary;
        },
        equals: (left, right) => left === right,
        dispose: () => {
          throw secondary;
        },
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    let failure: unknown;
    try {
      createRuntime({
        sources,
        computations: createRuntimeComputationRegistry({ sources }),
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      });
    } catch (cause) {
      failure = cause;
    }
    expect(failure).toBeInstanceOf(RetikzRuntimeError);
    if (!(failure instanceof RetikzRuntimeError)) throw new Error('expected lifecycle error');
    expect(failure.code).toBe(RetikzRuntimeErrorCode.ReadFailed);
    expect(failure.cause).toBe(primary);
    expect(failure.diagnostics[0].cause).toBe(secondary);
  });

  it('最终 Source dispose 的不可转成文本异常不阻断清理和 disposed 门禁', () => {
    const cleanup: Array<string> = [];
    const cause = Object.create(null);
    const define = (key: string) =>
      defineRuntimeSource<number, number, number, never>({
        key,
        value: {
          capture: value => value,
          read: value => value,
          equals: (left, right) => left === right,
          dispose: () => {
            cleanup.push(key);
            if (key === 'b') throw cause;
          },
        },
      });
    const a = define('a');
    const b = define('b');
    const sources = createRuntimeSourceRegistry([a, b]);
    const runtime = createRuntime({
      sources,
      computations: createRuntimeComputationRegistry({ sources }),
      initialSnapshots: [createRuntimeSourceInput(a, 1), createRuntimeSourceInput(b, 1)],
    });
    expect(() => runtime.dispose()).not.toThrow();
    expect(cleanup).toEqual(['b', 'a']);
    expect(runtime.diagnostics()[0].cause).toBe(cause);
    expect(() => runtime.snapshot(a)).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.Disposed }));
    runtime.dispose();
    expect(cleanup).toEqual(['b', 'a']);
  });
});
