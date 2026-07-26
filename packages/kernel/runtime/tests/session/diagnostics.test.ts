import { describe, expect, it } from 'vitest';

import type { RuntimeCommitEvent, RuntimeProgramTraceReporter } from '../../src/program';
import type { RuntimeSession } from '../../src/session';

import { RuntimeError } from '../../src/error';
import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const tracePhases = [
  {
    phase: 'update' as const,
    unit: 'program' as const,
    outcomes: ['incremental' as const],
  },
];

describe('runtime session diagnostics', () => {
  it('映射 trace diagnostic，并向所有 observer 提供同一 frozen commit-safe prefix', () => {
    const observerCause = new Error('observer failed');
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const observedPrefixes: Array<RuntimeCommitEvent<number>['diagnostics']> = [];
    const first = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      owners: [owner],
      programs: [],
      tracePhases,
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        const invalidRecord = {
          phase: 'update',
          unit: 'program',
          outcome: 'incremental',
          visited: 0,
          reused: 1,
          changed: 0,
        } as const;
        context.trace.report(invalidRecord);
        context.trace.report(invalidRecord);
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
      observeCommit: event => {
        if (event.phase === 'initial') return;
        observedPrefixes.push(event.diagnostics);
        throw observerCause;
      },
    });
    const second = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: 'incremental', artifact: view.snapshot(owner).value }),
      observeCommit: event => {
        if (event.phase === 'update') observedPrefixes.push(event.diagnostics);
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [second, first] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_TRACE_INVALID_RECORD',
        phase: 'trace',
        severity: 'error',
        owner: 'counter',
        program: { owner: 'counter', key: 'a' },
      }),
      expect.objectContaining({
        code: 'RUNTIME_TRACE_INVALID_RECORD',
        phase: 'trace',
        severity: 'error',
        owner: 'counter',
        program: { owner: 'counter', key: 'a' },
      }),
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_OBSERVER_FAILED',
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
    const queuedDiagnostics = session.diagnostics();
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
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    let artifactCaptureCount = 0;
    const upstream = defineRuntimeProgram<number, Readonly<{ value: number; candidate: boolean }>, number, number>({
      id: { owner: 'counter', key: 'a' },
      owners: [owner],
      programs: [],
      tracePhases,
      artifact: {
        capture: value => {
          artifactCaptureCount += 1;
          return Object.freeze({ value, candidate: artifactCaptureCount > 1 });
        },
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: value => {
          if (value.candidate) throw disposeCause;
        },
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        const diagnose = context.diagnose as (diagnostic: unknown) => void;
        diagnose({
          code: 'RUNTIME_TRACE_INVALID_RECORD',
          phase: 'trace',
          message: 'discard me',
          severity: 'error',
          owner: 'spoofed-owner',
          program: { owner: 'spoofed-owner', key: 'spoofed-program' },
        });
        context.trace.report({
          phase: 'update',
          unit: 'program',
          outcome: 'incremental',
          visited: 0,
          reused: 1,
          changed: 0,
        });
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
    });
    const downstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      owners: [],
      programs: [upstream],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.artifact(upstream).value }),
      update: () => {
        throw updateCause;
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [downstream, upstream] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    let thrown: unknown;
    try {
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_UPDATE_FAILED',
        cause: updateCause,
        diagnostics: [
          expect.objectContaining({ code: 'RUNTIME_TRACE_INVALID_RECORD' }),
          expect.objectContaining({
            code: 'RUNTIME_ARTIFACT_DISPOSE_FAILED',
            cause: disposeCause,
          }),
        ],
      }),
    );
    expect(thrown).toBeInstanceOf(RuntimeError);
    if (!(thrown instanceof RuntimeError)) throw new Error('expected RuntimeError');
    expect(session.revision()).toBe(0);
    expect(session.artifact(upstream)).toEqual({ revision: 0, value: 1 });
    const queuedDiagnostics = session.diagnostics();
    expect(queuedDiagnostics).toEqual(thrown.diagnostics);
    expect(queuedDiagnostics).not.toBe(thrown.diagnostics);
    expect(queuedDiagnostics).toHaveLength(2);
    expect(queuedDiagnostics[0]).toBe(thrown.diagnostics[0]);
    expect(queuedDiagnostics[1]).toBe(thrown.diagnostics[1]);
    expect(session.diagnostics()).toEqual([]);
  });

  it('统一注入 context 与 fallback warning 归属，不接受 JavaScript spoof 字段', () => {
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    let updates = 0;
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        updates += 1;
        const spoofedWarning = {
          code: updates === 1 ? 'CONTEXT_WARNING' : 'FALLBACK_WARNING',
          phase: 'update',
          message: 'Runtime must inject attribution',
          severity: 'error',
          owner: 'spoofed-owner',
          program: { owner: 'spoofed-owner', key: 'spoofed-program' },
        };
        if (updates === 1) {
          const diagnose = context.diagnose as (diagnostic: unknown) => void;
          diagnose(spoofedWarning);
          return { kind: 'incremental', artifact: view.snapshot(owner).value };
        }
        return {
          kind: 'fallback',
          diagnostics: [spoofedWarning],
        };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const contextResult = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });
    expect(contextResult.diagnostics).toEqual([
      {
        code: 'CONTEXT_WARNING',
        phase: 'update',
        severity: 'warning',
        message: 'Runtime must inject attribution',
        owner: 'counter',
        program: { owner: 'counter', key: 'program' },
      },
    ]);
    session.diagnostics();

    const fallbackResult = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 3)],
    });
    expect(fallbackResult.outcome).toBe('fallback');
    expect(fallbackResult.diagnostics).toEqual([
      {
        code: 'FALLBACK_WARNING',
        phase: 'update',
        severity: 'warning',
        message: 'Runtime must inject attribution',
        owner: 'counter',
        program: { owner: 'counter', key: 'program' },
      },
    ]);
  });

  it('dispose 阶段阻止 reentry，并把 cleanup throw 留在 disposed session queue', () => {
    const sessionRef: { current?: RuntimeSession } = {};
    const reentryErrors: Array<RuntimeError> = [];
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: () => {
          const activeSession = sessionRef.current;
          if (activeSession === undefined) return;
          const captureReentry = (action: () => unknown) => {
            try {
              action();
            } catch (cause) {
              if (!(cause instanceof RuntimeError)) throw cause;
              reentryErrors.push(cause);
            }
          };
          expect(activeSession.revision()).toBe(0);
          captureReentry(() => activeSession.snapshot(owner));
          captureReentry(() => activeSession.artifact(program));
          captureReentry(() =>
            activeSession.update({
              baseRevision: activeSession.revision(),
              owners: [createRuntimeOwnerUpdate(owner, 2)],
            }),
          );
          captureReentry(() => activeSession.diagnostics());
          captureReentry(() => activeSession.dispose());
          throw reentryErrors[0];
        },
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    sessionRef.current = session;

    expect(() => session.dispose()).not.toThrow();
    expect(reentryErrors.map(error => [error.code, error.phase])).toEqual([
      ['RUNTIME_SESSION_REENTRANT', 'snapshot'],
      ['RUNTIME_SESSION_REENTRANT', 'artifact'],
      ['RUNTIME_SESSION_REENTRANT', 'update'],
      ['RUNTIME_SESSION_REENTRANT', 'diagnostics'],
      ['RUNTIME_SESSION_REENTRANT', 'dispose'],
    ]);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_OWNER_DISPOSE_FAILED',
        severity: 'error',
        owner: 'counter',
        cause: expect.objectContaining({ code: 'RUNTIME_SESSION_REENTRANT' }),
      }),
    ]);
  });

  it('dispose 按反向 Program/Owner 顺序继续清理，重复调用不重复释放', () => {
    const cleanupOrder: Array<string> = [];
    const ownerA = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
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
    const ownerB = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
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
    const owners = createRuntimeOwnerRegistry({ builtins: [ownerB, ownerA] });
    const programA = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'a', key: 'derive' },
      owners: [ownerA],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => Object.freeze({ value }),
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: () => {
          cleanupOrder.push('program:a');
          throw new Error('program a dispose failed');
        },
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(ownerA).value }),
    });
    const programB = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'b', key: 'derive' },
      owners: [ownerB],
      programs: [programA],
      tracePhases: [],
      artifact: {
        capture: value => Object.freeze({ value }),
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: () => {
          cleanupOrder.push('program:b');
          throw new Error('program b dispose failed');
        },
      },
      run: view => ({
        kind: 'full',
        artifact: view.artifact(programA).value + view.snapshot(ownerB).value,
      }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [programB, programA] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(ownerB, 2), createRuntimeOwnerInput(ownerA, 1)],
    });

    session.dispose();
    session.dispose();

    expect(cleanupOrder).toEqual(['program:b', 'program:a', 'owner:b', 'owner:a']);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_ARTIFACT_DISPOSE_FAILED',
        program: { owner: 'b', key: 'derive' },
      }),
      expect.objectContaining({
        code: 'RUNTIME_ARTIFACT_DISPOSE_FAILED',
        program: { owner: 'a', key: 'derive' },
      }),
      expect.objectContaining({ code: 'RUNTIME_OWNER_DISPOSE_FAILED', owner: 'b' }),
      expect.objectContaining({ code: 'RUNTIME_OWNER_DISPOSE_FAILED', owner: 'a' }),
    ]);
    expect(session.diagnostics()).toEqual([]);
  });

  it.each([
    {
      name: 'sink throw',
      expectedCode: 'RUNTIME_TRACE_SINK_FAILED',
      createSink: () => () => {
        throw new Error('sink failed');
      },
    },
    {
      name: 'reentrant report',
      expectedCode: 'RUNTIME_TRACE_REENTRANT',
      createSink: (readReporter: () => RuntimeProgramTraceReporter | undefined) => () => {
        readReporter()?.report({
          phase: 'update',
          unit: 'program',
          outcome: 'incremental',
          visited: 1,
          reused: 0,
          changed: 1,
        });
      },
    },
  ])('映射 $name reporter diagnostic', testCase => {
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    let activeReporter: RuntimeProgramTraceReporter | undefined;
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases,
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        activeReporter = context.trace;
        context.trace.report({
          phase: 'update',
          unit: 'program',
          outcome: 'incremental',
          visited: 1,
          reused: 0,
          changed: 1,
        });
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      trace: testCase.createSink(() => activeReporter),
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: testCase.expectedCode,
        phase: 'trace',
        program: { owner: 'counter', key: 'program' },
      }),
    ]);
  });

  it('semantic-equal candidate dispose failure 随 bailout result 与 queue 返回', () => {
    const disposeCause = new Error('equal candidate dispose failed');
    let captures = 0;
    const owner = defineRuntimeOwner<number, Readonly<{ value: number; candidate: boolean }>, number, never>({
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
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 1)],
    });

    expect(result).toEqual({
      revision: 0,
      outcome: 'bailout',
      diagnostics: [
        expect.objectContaining({
          code: 'RUNTIME_OWNER_DISPOSE_FAILED',
          cause: disposeCause,
        }),
      ],
    });
    expect(session.diagnostics()).toEqual(result.diagnostics);
  });

  it('后序 Owner prepare 失败时保留此前 equal candidate cleanup diagnostic 到 error/queue', () => {
    const disposeCause = new Error('equal candidate dispose failed');
    const captureCause = new Error('later owner capture failed');
    let firstCaptures = 0;
    const first = defineRuntimeOwner<number, Readonly<{ value: number; candidate: boolean }>, number, never>({
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
    const second = defineRuntimeOwner<number, number, number, never>({
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
    const owners = createRuntimeOwnerRegistry({ builtins: [second, first] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(second, 1), createRuntimeOwnerInput(first, 1)],
    });

    let thrown: unknown;
    try {
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(first, 1), createRuntimeOwnerUpdate(second, 2)],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_OWNER_CAPTURE_FAILED',
        cause: captureCause,
        diagnostics: [
          expect.objectContaining({
            code: 'RUNTIME_OWNER_DISPOSE_FAILED',
            owner: 'a',
            cause: disposeCause,
          }),
        ],
      }),
    );
    expect(thrown).toBeInstanceOf(RuntimeError);
    if (!(thrown instanceof RuntimeError)) throw new Error('expected RuntimeError');
    expect(session.revision()).toBe(0);
    expect(session.snapshot(first)).toEqual({ revision: 0, value: 1 });
    expect(session.snapshot(second)).toEqual({ revision: 0, value: 1 });
    const queuedDiagnostics = session.diagnostics();
    expect(queuedDiagnostics).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_OWNER_DISPOSE_FAILED',
        owner: 'a',
        cause: disposeCause,
      }),
    ]);
    expect(thrown.diagnostics[0]).toBe(queuedDiagnostics[0]);
    expect(Object.isFrozen(thrown.diagnostics)).toBe(true);
    expect(Object.isFrozen(thrown.diagnostics[0])).toBe(true);
    expect(session.diagnostics()).toEqual([]);
  });

  it('artifact prepare failure 保留同 callback 的 trace diagnostics', () => {
    const captureCause = new Error('candidate artifact capture failed');
    let captures = 0;
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases,
      artifact: {
        capture: value => {
          captures += 1;
          if (captures > 1) throw captureCause;
          return value;
        },
        readForProgram: value => value,
        read: value => value,
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view, context) => {
        context.trace.report({
          phase: 'update',
          unit: 'program',
          outcome: 'incremental',
          visited: 0,
          reused: 1,
          changed: 0,
        });
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    let thrown: unknown;
    try {
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_ARTIFACT_CAPTURE_FAILED',
        cause: captureCause,
        diagnostics: [expect.objectContaining({ code: 'RUNTIME_TRACE_INVALID_RECORD' })],
      }),
    );
    expect(session.diagnostics()).toEqual([expect.objectContaining({ code: 'RUNTIME_TRACE_INVALID_RECORD' })]);
  });
});
