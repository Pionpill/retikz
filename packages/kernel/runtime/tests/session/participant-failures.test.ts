import { describe, expect, it } from 'vitest';

import type { RuntimeCommitParticipantDefinitionInput, RuntimeDiagnostic } from '../../src';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
} from '../../src';

const defineCounterOwner = () =>
  defineRuntimeOwner<number, number, number, never>({
    key: 'counter',
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

describe('runtime session participant failure lifecycle', () => {
  it.each([
    ['prepare', 'RUNTIME_PARTICIPANT_PREPARE_FAILED'] as const,
    ['commit', 'RUNTIME_PARTICIPANT_COMMIT_FAILED'] as const,
  ])('update %s failure 回滚 prepared tokens、保留旧 cache 并把 warning 同步入 queue', (failurePhase, code) => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const calls: Array<string> = [];
    const trigger = new Error(`${failurePhase} failed`);
    let failing = false;
    const define = (key: string, shouldFail: boolean) => {
      let value = 1;
      return defineRuntimeCommitParticipant({
        key,
        owners: [owner],
        programs: [],
        revisionPolicy: 'affected',
        tracePhases: [],
        prepare: (candidate, context) => {
          calls.push(`prepare:${key}`);
          if (failing && shouldFail && failurePhase === 'prepare') {
            context.diagnose({ code: 'ATTEMPTED', phase: 'prepare', message: 'attempted' });
            throw trigger;
          }
          const previous = value;
          const next = candidate.snapshot(owner).value;
          return Object.freeze({
            commit: () => {
              calls.push(`commit:${key}`);
              if (failing && shouldFail && failurePhase === 'commit') {
                context.diagnose({ code: 'ATTEMPTED', phase: 'commit', message: 'attempted' });
                throw trigger;
              }
              value = next;
            },
            rollback: () => {
              calls.push(`rollback:${key}`);
              value = previous;
            },
            dispose: () => calls.push(`token-dispose:${key}`),
          });
        },
        read: () => Object.freeze({ value }),
        dispose: () => undefined,
      });
    };
    const first = define('a', false);
    const second = define('b', true);
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [first, second],
    });
    const oldFirst = session.participant(first);
    const oldSecond = session.participant(second);
    calls.length = 0;
    failing = true;

    let thrown: unknown;
    try {
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(owner, 2)] });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(expect.objectContaining({ code, cause: trigger, owner: 'b' }));
    expect(session.revision()).toBe(0);
    expect(session.participant(first)).toBe(oldFirst);
    expect(session.participant(second)).toBe(oldSecond);
    expect(calls).toEqual(
      failurePhase === 'prepare'
        ? ['prepare:a', 'prepare:b', 'rollback:a', 'token-dispose:a']
        : [
            'prepare:a',
            'prepare:b',
            'commit:a',
            'commit:b',
            'rollback:b',
            'rollback:a',
            'token-dispose:b',
            'token-dispose:a',
          ],
    );
    const errorDiagnostic = (thrown as { diagnostics: ReadonlyArray<RuntimeDiagnostic> }).diagnostics[0];
    const queuedDiagnostic = session.diagnostics()[0];
    expect(errorDiagnostic).toEqual(expect.objectContaining({ code: 'ATTEMPTED', owner: 'b' }));
    expect(queuedDiagnostic).toBe(errorDiagnostic);
    session.dispose();
  });

  it('prepare 返回 malformed token 时稳定拒绝且不执行 commit', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let commitCalls = 0;
    let disposeCalls = 0;
    const malformed = {
      commit: () => {
        commitCalls += 1;
      },
    };
    const participant = defineRuntimeCommitParticipant({
      key: 'malformed',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: (() => malformed) as unknown as RuntimeCommitParticipantDefinitionInput<
        Readonly<Record<string, never>>
      >['prepare'],
      read: () => Object.freeze({}),
      dispose: () => {
        disposeCalls += 1;
      },
    });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants: [participant],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED', cause: malformed }));
    expect(commitCalls).toBe(0);
    expect(disposeCalls).toBe(1);
  });

  it('claim 后 owner initial capture 失败仍释放 participant 并永久 consumed', () => {
    const trigger = new Error('capture failed');
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: () => {
          throw trigger;
        },
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let disposeCalls = 0;
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => Object.freeze({}),
      dispose: () => {
        disposeCalls += 1;
      },
    });
    const create = () =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants: [participant],
      });

    expect(create).toThrowError(expect.objectContaining({ cause: trigger }));
    expect(disposeCalls).toBe(1);
    expect(create).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ALREADY_OWNED' }));
    expect(disposeCalls).toBe(1);
  });

  it('initial commit failure 按 key 正序执行并反向 rollback/token dispose/participant dispose', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const calls: Array<string> = [];
    const trigger = new Error('commit failed');
    const define = (key: string, failCommit: boolean) =>
      defineRuntimeCommitParticipant({
        key,
        owners: [owner],
        programs: [],
        revisionPolicy: 'affected',
        tracePhases: [],
        prepare: () => {
          calls.push(`prepare:${key}`);
          return Object.freeze({
            commit: () => {
              calls.push(`commit:${key}`);
              if (failCommit) throw trigger;
            },
            rollback: () => calls.push(`rollback:${key}`),
            dispose: () => calls.push(`token-dispose:${key}`),
          });
        },
        read: () => {
          calls.push(`read:${key}`);
          return Object.freeze({ key });
        },
        dispose: () => calls.push(`participant-dispose:${key}`),
      });
    const second = define('b', true);
    const first = define('a', false);

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants: [second, first],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_COMMIT_FAILED', cause: trigger, owner: 'b' }));
    expect(calls).toEqual([
      'prepare:a',
      'prepare:b',
      'commit:a',
      'commit:b',
      'rollback:b',
      'rollback:a',
      'token-dispose:b',
      'token-dispose:a',
      'participant-dispose:b',
      'participant-dispose:a',
    ]);
  });

  it('initial read failure 保留 primary，并把 rollback/token/instance dispose failure 作为 secondary', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const readFailure = new Error('read failed');
    const rollbackFailure = new Error('rollback failed');
    const tokenDisposeFailure = new Error('token dispose failed');
    const participantDisposeFailure = new Error('participant dispose failed');
    const participant = defineRuntimeCommitParticipant({
      key: 'failing',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [{ phase: 'update', unit: 'scene-change', outcomes: ['incremental'] }],
      prepare: (_candidate, context) =>
        Object.freeze({
          commit: () => undefined,
          rollback: () => {
            const report = context.trace.report as (record: unknown) => void;
            report({ phase: 'invalid' });
            throw rollbackFailure;
          },
          dispose: () => {
            throw tokenDisposeFailure;
          },
        }),
      read: () => {
        throw readFailure;
      },
      dispose: () => {
        throw participantDisposeFailure;
      },
    });

    let thrown: unknown;
    try {
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants: [participant],
      });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED', cause: readFailure, owner: 'failing' }),
    );
    const diagnostics = (thrown as { diagnostics: ReadonlyArray<RuntimeDiagnostic> }).diagnostics;
    expect(diagnostics.map(diagnostic => diagnostic.code)).toEqual([
      'RUNTIME_TRACE_INVALID_RECORD',
      'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
      'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED',
      'RUNTIME_PARTICIPANT_DISPOSE_FAILED',
    ]);
    expect(diagnostics.map(diagnostic => diagnostic.cause)).toEqual([
      undefined,
      rollbackFailure,
      tokenDisposeFailure,
      participantDisposeFailure,
    ]);
  });

  it('publish 后 token dispose failure 只进入 session diagnostics', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const trigger = new Error('token dispose failed');
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate =>
        Object.freeze({
          commit: () => undefined,
          rollback: () => undefined,
          dispose: () => {
            if (candidate.phase === 'initial') throw trigger;
          },
        }),
      read: () => Object.freeze({ value: 1 }),
      dispose: () => undefined,
    });

    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });

    expect(session.revision()).toBe(0);
    expect(session.diagnostics()).toEqual([
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_TOKEN_DISPOSE_FAILED', cause: trigger, owner: 'view' }),
    ]);
    session.dispose();
  });

  it('update rollback throw 进入 broken，保留旧 read/revision 并允许 diagnostics/dispose', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const readFailure = new Error('read failed');
    const firstRollbackFailure = new Error('rollback b failed');
    const secondRollbackFailure = new Error('rollback a failed');
    let fail = false;
    let sessionDisposeCalls = 0;
    const define = (key: string, rollbackFailure?: Error) => {
      let live = 1;
      const input: RuntimeCommitParticipantDefinitionInput<Readonly<{ value: number }>> = {
        key,
        owners: [owner],
        programs: [],
        revisionPolicy: 'affected',
        tracePhases: [],
        prepare: candidate => {
          const previous = live;
          const next = candidate.snapshot(owner).value;
          return Object.freeze({
            commit: () => {
              live = next;
            },
            rollback: () => {
              live = previous;
              if (rollbackFailure !== undefined) throw rollbackFailure;
            },
            dispose: () => undefined,
          });
        },
        read: () => {
          if (fail && key === 'b') throw readFailure;
          return Object.freeze({ value: live });
        },
        dispose: () => {
          sessionDisposeCalls += 1;
        },
      };
      return defineRuntimeCommitParticipant(input);
    };
    const first = define('a', secondRollbackFailure);
    const second = define('b', firstRollbackFailure);
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [first, second],
    });
    fail = true;

    let thrown: unknown;
    try {
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(owner, 2)] });
    } catch (cause) {
      thrown = cause;
    }

    expect(thrown).toEqual(
      expect.objectContaining({
        code: 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED',
        phase: 'rollback',
        owner: 'b',
        cause: Object.freeze({
          trigger: expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED', cause: readFailure }),
          rollback: firstRollbackFailure,
        }),
      }),
    );
    expect(Object.isFrozen((thrown as { cause: object }).cause)).toBe(true);
    expect(session.revision()).toBe(0);
    expect(() => session.participant(first)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED' }),
    );
    expect(() =>
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(owner, 3)] }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ROLLBACK_FAILED' }));
    expect(session.diagnostics().map(diagnostic => diagnostic.cause)).toContain(secondRollbackFailure);
    expect(() => session.dispose()).not.toThrow();
    expect(sessionDisposeCalls).toBe(2);
  });
});
