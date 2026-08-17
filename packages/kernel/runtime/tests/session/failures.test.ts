import { describe, expect, it, vi } from 'vitest';

import type { RuntimeSession } from '../../src/session';

import { RetikzRuntimeError } from '../../src/error';
import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram, RuntimeProgramKind, RuntimeProgramPhase } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

describe('runtime session failure isolation', () => {
  it('initial Program run throw 即使伪造 RetikzRuntimeError 仍固定映射，并反向释放已捕获 owner', () => {
    const cause = new RetikzRuntimeError({
      code: 'RUNTIME_REVISION_STALE',
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
    const owner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: () => {
        throw cause;
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });

    let thrown: unknown;
    try {
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);
    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');
    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_RUN_FAILED',
        phase: 'run',
        program: { owner: 'counter', key: 'program' },
        cause,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('update callback throw 即使伪造 RetikzRuntimeError 仍固定映射并回滚 candidate', () => {
    const cause = new RetikzRuntimeError({
      code: 'RUNTIME_REVISION_STALE',
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
    const owner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => ({ value }),
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: () => {
        throw cause;
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
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);
    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');
    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_UPDATE_FAILED',
        phase: RuntimeProgramPhase.Update,
        program: { owner: 'counter', key: 'program' },
        cause,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(session.diagnostics()).toEqual([]);
    expect(session.revision()).toBe(0);
    expect(session.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(session.artifact(program)).toEqual({ revision: 0, value: 1 });
    expect(dispose).toHaveBeenCalledTimes(1);
  });

  it('上一次 callback 捕获的内部错误不能在下一次 invocation 重放为 primary', () => {
    const declared = defineRuntimeOwner<number, number, number, never>({
      key: 'declared',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const hidden = defineRuntimeOwner<number, number, number, never>({
      key: 'hidden',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [declared, hidden] });
    let replayed: RetikzRuntimeError | undefined;
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'declared', key: 'program' },
      owners: [declared],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(declared).value }),
      update: (_previous, view) => {
        if (view.snapshot(declared).value === 2) {
          try {
            view.snapshot(hidden);
          } catch (error) {
            if (!(error instanceof RetikzRuntimeError)) throw error;
            replayed = error;
          }
          return { kind: RuntimeProgramKind.Incremental, artifact: 2 };
        }
        if (replayed === undefined) throw new Error('expected captured Runtime contract error');
        throw replayed;
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(declared, 1), createRuntimeOwnerInput(hidden, 1)],
    });
    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(declared, 2)],
      }),
    ).toEqual(expect.objectContaining({ revision: 1, outcome: RuntimeProgramKind.Incremental }));

    let thrown: unknown;
    try {
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(declared, 3)],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(RetikzRuntimeError);
    if (!(thrown instanceof RetikzRuntimeError)) throw new Error('expected RetikzRuntimeError');
    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_UPDATE_FAILED',
        phase: RuntimeProgramPhase.Update,
        program: { owner: 'declared', key: 'program' },
        cause: replayed,
      }),
    );
    expect(thrown.diagnostics).toEqual([]);
    expect(session.diagnostics()).toEqual([]);
    expect(session.revision()).toBe(1);
    expect(session.snapshot(declared)).toEqual({ revision: 1, value: 2 });
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('observer throw 与 session reentry 不回滚 publish，后序 observer仍执行并进入 queue', () => {
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
    const sessionRef: { current?: RuntimeSession } = {};
    const secondObserver = vi.fn();
    const first = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: RuntimeProgramKind.Incremental,
        artifact: view.snapshot(owner).value,
      }),
      observeCommit: event => {
        if (event.phase === RuntimeProgramPhase.Initial) return;
        const activeSession = sessionRef.current;
        if (activeSession === undefined) throw new Error('test session was not assigned');
        const reentrantCalls = [
          () => activeSession.snapshot(owner),
          () => activeSession.artifact(first),
          () => activeSession.update({ baseRevision: activeSession.revision(), owners: [] }),
          () => activeSession.dispose(),
          () => activeSession.diagnostics(),
        ];
        for (const call of reentrantCalls) {
          expect(call).toThrowError(expect.objectContaining({ code: 'RUNTIME_SESSION_REENTRANT' }));
        }
        expect(activeSession.revision()).toBe(1);
        throw observerCause;
      },
    });
    const second = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: RuntimeProgramKind.Incremental,
        artifact: view.snapshot(owner).value,
      }),
      observeCommit: event => {
        if (event.phase === RuntimeProgramPhase.Update) secondObserver(event);
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [second, first] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    sessionRef.current = session;

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result.revision).toBe(1);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_OBSERVER_FAILED',
        phase: 'observe',
        severity: 'error',
        program: { owner: 'counter', key: 'a' },
        cause: observerCause,
      }),
    ]);
    expect(secondObserver).toHaveBeenCalledOnce();
    expect(session.artifact(second)).toEqual({ revision: 1, value: 2 });
    expect(session.diagnostics()).toEqual(result.diagnostics);
    expect(session.diagnostics()).toEqual([]);
  });

  it('initial observer throw 不阻止 Session 返回，后序 observer 读取同一 frozen diagnostic 前缀', () => {
    const observerCause = new Error('initial observer failed');
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const observedPrefixes: Array<ReadonlyArray<unknown>> = [];
    const first = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'a' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: (view, context) => {
        context.diagnose({
          code: 'INITIAL_WARNING',
          phase: 'run',
          message: 'initial warning',
        });
        return { kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value };
      },
      observeCommit: event => {
        observedPrefixes.push(event.diagnostics);
        throw observerCause;
      },
    });
    const secondObserver = vi.fn();
    const second = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'b' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      observeCommit: event => {
        observedPrefixes.push(event.diagnostics);
        secondObserver(event);
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [second, first] });

    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(session.revision()).toBe(0);
    expect(session.artifact(second)).toEqual({ revision: 0, value: 1 });
    expect(secondObserver).toHaveBeenCalledOnce();
    expect(observedPrefixes).toHaveLength(2);
    expect(observedPrefixes[0]).toBe(observedPrefixes[1]);
    expect(Object.isFrozen(observedPrefixes[0])).toBe(true);
    expect(observedPrefixes[0]).toEqual([
      expect.objectContaining({
        code: 'INITIAL_WARNING',
        severity: 'warning',
        program: { owner: 'counter', key: 'a' },
      }),
    ]);
    expect(session.diagnostics()).toEqual([
      observedPrefixes[0]?.[0],
      expect.objectContaining({
        code: 'RUNTIME_PROGRAM_OBSERVER_FAILED',
        phase: 'observe',
        cause: observerCause,
        program: { owner: 'counter', key: 'a' },
      }),
    ]);
  });
});
