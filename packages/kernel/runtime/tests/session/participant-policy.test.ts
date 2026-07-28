import { describe, expect, it } from 'vitest';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
  defineRuntimeProgram,
} from '../../src';

const defineCounterOwner = (key: string) =>
  defineRuntimeOwner<number, number, number, never>({
    key,
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime session participant revision policy', () => {
  it('participants omitted 与显式空数组严格保持既有 session 行为', () => {
    const owner = defineCounterOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const base = { owners, programs, initialSnapshots: [createRuntimeOwnerInput(owner, 1)] };
    const omitted = createRuntimeSession(base);
    const explicit = createRuntimeSession({ ...base, participants: [] });

    const omittedResult = omitted.update({
      baseRevision: omitted.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });
    const explicitResult = explicit.update({
      baseRevision: explicit.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });
    expect(explicitResult).toEqual(omittedResult);
    expect(explicit.snapshot(owner)).toEqual(omitted.snapshot(owner));
    omitted.dispose();
    explicit.dispose();
  });

  it('affected participant 在声明 Program 产生新 artifact 时执行并读取 candidate public artifact', () => {
    const owner = defineCounterOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, Readonly<{ value: number }>>({
      id: { owner: 'counter', key: 'artifact' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => value,
        readForProgram: value => value,
        read: value => Object.freeze({ value }),
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: 'incremental', artifact: view.snapshot(owner).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const preparedValues: Array<number> = [];
    let committed: Readonly<{ value: number }> = Object.freeze({ value: -1 });
    const participant = defineRuntimeCommitParticipant({
      key: 'artifact-consumer',
      owners: [],
      programs: [program],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const previous = committed;
        const next = candidate.artifact(program).value;
        preparedValues.push(next.value);
        return Object.freeze({
          commit: () => {
            committed = next;
          },
          rollback: () => {
            committed = previous;
          },
          dispose: () => undefined,
        });
      },
      read: () => committed,
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });
    preparedValues.length = 0;

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(preparedValues).toEqual([2]);
    expect(session.participant(participant)).toEqual({ value: 2 });
    session.dispose();
  });

  it('affected 只响应声明依赖，continuous 响应每个非 bailout commit', () => {
    const primary = defineCounterOwner('primary');
    const unrelated = defineCounterOwner('unrelated');
    const owners = createRuntimeOwnerRegistry({ builtins: [primary, unrelated] });
    const programs = createRuntimeProgramRegistry({ owners });
    const affectedCalls: Array<number> = [];
    const continuousCalls: Array<number> = [];
    const define = (key: string, revisionPolicy: 'affected' | 'continuous', calls: Array<number>) => {
      let read: Readonly<{ revision: number }> = Object.freeze({ revision: -1 });
      return defineRuntimeCommitParticipant({
        key,
        owners: [primary],
        programs: [],
        revisionPolicy,
        tracePhases: [],
        prepare: candidate => {
          const previous = read;
          const next = Object.freeze({ revision: candidate.candidateRevision });
          calls.push(candidate.candidateRevision);
          return Object.freeze({
            commit: () => {
              read = next;
            },
            rollback: () => {
              read = previous;
            },
            dispose: () => undefined,
          });
        },
        read: () => read,
        dispose: () => undefined,
      });
    };
    const affected = define('affected', 'affected', affectedCalls);
    const continuous = define('continuous', 'continuous', continuousCalls);
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(primary, 1), createRuntimeOwnerInput(unrelated, 1)],
      participants: [continuous, affected],
    });
    affectedCalls.length = 0;
    continuousCalls.length = 0;
    const oldAffectedRead = session.participant(affected);

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(unrelated, 2)],
      }).outcome,
    ).toBe('committed');
    expect(affectedCalls).toEqual([]);
    expect(continuousCalls).toEqual([1]);
    expect(session.participant(affected)).toBe(oldAffectedRead);

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(unrelated, 2)],
      }).outcome,
    ).toBe('bailout');
    expect(continuousCalls).toEqual([1]);

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(primary, 2)],
    });
    expect(affectedCalls).toEqual([2]);
    expect(continuousCalls).toEqual([1, 2]);
    session.dispose();
  });

  it('session dispose failure 不阻断反向 cleanup，并只重试失败 participant', () => {
    let ownerDisposeCalls = 0;
    let artifactDisposeCalls = 0;
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: () => {
          ownerDisposeCalls += 1;
        },
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'artifact' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => value,
        readForProgram: value => value,
        read: value => value,
        dispose: () => {
          artifactDisposeCalls += 1;
        },
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const calls: Array<string> = [];
    const trigger = new Error('dispose failed');
    const define = (key: string, failCount: number) => {
      let remainingFailures = failCount;
      return defineRuntimeCommitParticipant({
        key,
        owners: [owner],
        programs: [],
        revisionPolicy: 'affected',
        tracePhases: [],
        prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
        read: () => Object.freeze({}),
        dispose: () => {
          calls.push(key);
          if (remainingFailures > 0) {
            remainingFailures -= 1;
            throw trigger;
          }
        },
      });
    };
    const first = define('a', 0);
    const second = define('b', 2);
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [first, second],
    });

    expect(() => session.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DISPOSE_FAILED', cause: trigger, owner: 'b' }),
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DISPOSE_FAILED', cause: trigger, owner: 'b' }),
    ]);
    expect(() => session.participant(first)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_SESSION_DISPOSED' }),
    );
    expect(() => session.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
    expect(session.diagnostics()).toEqual([]);
    expect(() => session.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
  });
});
