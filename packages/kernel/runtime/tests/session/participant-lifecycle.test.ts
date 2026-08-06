import { describe, expect, it } from 'vitest';

import type { RuntimeError, RuntimeSession, RuntimeSessionOptions } from '../../src';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
  RuntimeProgramPhase,
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

describe('runtime session participant lifecycle', () => {
  it('initial create 在 publish 前 prepare、commit 并缓存 participant read', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const calls: Array<string> = [];
    let liveValue = -1;
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        calls.push(`prepare:${candidate.phase}:${candidate.snapshot(owner).value}`);
        const previous = liveValue;
        const next = candidate.snapshot(owner).value;
        return Object.freeze({
          commit: () => {
            calls.push('commit');
            liveValue = next;
          },
          rollback: () => {
            calls.push('rollback');
            liveValue = previous;
          },
          dispose: () => calls.push('token-dispose'),
        });
      },
      read: () => {
        calls.push('read');
        return Object.freeze({ value: liveValue });
      },
      dispose: () => calls.push('participant-dispose'),
    });
    const options = {
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 7)],
      participants: [participant],
    } as unknown as RuntimeSessionOptions;

    const session = createRuntimeSession(options);

    expect(calls).toEqual(['prepare:initial:7', 'commit', 'read', 'token-dispose']);
    const participantRead = Reflect.get(session, 'participant') as (token: typeof participant) => { value: number };
    expect(participantRead).toBeTypeOf('function');
    expect(participantRead(participant)).toEqual({ value: 7 });
    expect(participantRead(participant)).toEqual({ value: 7 });
    expect(calls.filter(call => call === 'read')).toHaveLength(1);
  });

  it('affected participant 在依赖 owner 更新时与 revision 原子提交', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const calls: Array<string> = [];
    let liveValue = -1;
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const next = candidate.snapshot(owner).value;
        const previous = liveValue;
        calls.push(`prepare:${candidate.phase}:${candidate.baseRevision}->${candidate.candidateRevision}:${next}`);
        return Object.freeze({
          commit: () => {
            calls.push('commit');
            liveValue = next;
          },
          rollback: () => {
            calls.push('rollback');
            liveValue = previous;
          },
          dispose: () => calls.push('token-dispose'),
        });
      },
      read: () => {
        calls.push('read');
        return Object.freeze({ value: liveValue });
      },
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });
    calls.length = 0;

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result).toEqual({ revision: 1, outcome: 'committed', diagnostics: [] });
    expect(calls).toEqual(['prepare:update:0->1:2', 'commit', 'read', 'token-dispose']);
    expect(session.participant(participant)).toEqual({ value: 2 });
    expect(session.revision()).toBe(1);
  });

  it('participant 被 session 接管后永久 consumed，不能跨 session 复用', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let disposeCalls = 0;
    const participant = defineRuntimeCommitParticipant({
      key: 'owned',
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
    const session = create();

    expect(create).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ALREADY_OWNED' }));
    expect(disposeCalls).toBe(0);

    session.dispose();

    expect(disposeCalls).toBe(1);
    expect(create).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ALREADY_OWNED' }));
    expect(disposeCalls).toBe(1);
  });

  it('initial prepare 失败保留 cause、释放 participant 并永久 consumed', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const trigger = new Error('prepare failed');
    let disposeCalls = 0;
    const participant = defineRuntimeCommitParticipant({
      key: 'failing',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => {
        throw trigger;
      },
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

    expect(create).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_PREPARE_FAILED', cause: trigger }),
    );
    expect(disposeCalls).toBe(1);
    expect(create).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ALREADY_OWNED' }));
    expect(disposeCalls).toBe(1);
  });

  it('update read 失败回滚 view 并保留旧 revision 与 committed read', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const trigger = new Error('read failed');
    const calls: Array<string> = [];
    let liveValue = -1;
    let failRead = false;
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const previous = liveValue;
        const next = candidate.snapshot(owner).value;
        return Object.freeze({
          commit: () => {
            calls.push('commit');
            liveValue = next;
          },
          rollback: () => {
            calls.push('rollback');
            liveValue = previous;
          },
          dispose: () => calls.push('token-dispose'),
        });
      },
      read: () => {
        calls.push('read');
        if (failRead) throw trigger;
        return Object.freeze({ value: liveValue });
      },
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });
    calls.length = 0;
    failRead = true;

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED', cause: trigger }));
    expect(calls).toEqual(['commit', 'read', 'rollback', 'token-dispose']);
    expect(session.revision()).toBe(0);
    expect(session.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(session.participant(participant)).toEqual({ value: 1 });
  });

  it('第二个 participant read 失败不局部发布前序 read cache', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let failSecond = false;
    const define = (key: string, shouldFail: boolean) => {
      let liveValue = 1;
      return defineRuntimeCommitParticipant({
        key,
        owners: [owner],
        programs: [],
        revisionPolicy: 'affected',
        tracePhases: [],
        prepare: candidate => {
          const previous = liveValue;
          const next = candidate.snapshot(owner).value;
          return Object.freeze({
            commit: () => {
              liveValue = next;
            },
            rollback: () => {
              liveValue = previous;
            },
            dispose: () => undefined,
          });
        },
        read: () => {
          if (shouldFail && failSecond) throw new Error('second read failed');
          return Object.freeze({ value: liveValue });
        },
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
    failSecond = true;

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED', owner: 'b' }));
    expect(session.participant(first)).toBe(oldFirst);
    expect(session.participant(second)).toBe(oldSecond);
    expect(session.participant(first)).toEqual({ value: 1 });
    expect(session.participant(second)).toEqual({ value: 1 });
  });

  it('participant update callbacks 不能经 session API 重入观察半提交状态', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const reentryErrors: Array<RuntimeError> = [];
    const sessionRef: { current?: RuntimeSession } = {};
    let participantRead: Readonly<{ value: number }> = Object.freeze({ value: 1 });
    const captureReentry = (callback: () => void): void => {
      try {
        callback();
      } catch (cause) {
        reentryErrors.push(cause as RuntimeError);
      }
    };
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const previous = participantRead;
        const next = Object.freeze({ value: candidate.snapshot(owner).value });
        if (candidate.phase === RuntimeProgramPhase.Update) captureReentry(() => sessionRef.current?.snapshot(owner));
        return Object.freeze({
          commit: () => {
            if (candidate.phase === RuntimeProgramPhase.Update) {
              captureReentry(() => sessionRef.current?.participant(participant));
            }
            participantRead = next;
          },
          rollback: () => {
            participantRead = previous;
          },
          dispose: () => {
            if (candidate.phase === RuntimeProgramPhase.Update) captureReentry(() => sessionRef.current?.diagnostics());
          },
        });
      },
      read: () => {
        if (sessionRef.current !== undefined) {
          captureReentry(() => sessionRef.current?.update({ baseRevision: sessionRef.current.revision(), owners: [] }));
        }
        return participantRead;
      },
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });
    sessionRef.current = session;

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(reentryErrors.map(error => error.code)).toEqual([
      'RUNTIME_SESSION_REENTRANT',
      'RUNTIME_SESSION_REENTRANT',
      'RUNTIME_SESSION_REENTRANT',
      'RUNTIME_SESSION_REENTRANT',
    ]);
    expect(session.participant(participant)).toEqual({ value: 2 });
    session.dispose();
  });

  it('rollback 与 participant dispose callback 同样遵守 session reentry gate', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const sessionRef: { current?: RuntimeSession } = {};
    const reentryCodes: Array<string> = [];
    let failRead = false;
    const capture = (callback: () => void): void => {
      try {
        callback();
      } catch (cause) {
        reentryCodes.push((cause as RuntimeError).code);
      }
    };
    const participant = defineRuntimeCommitParticipant({
      key: 'view',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () =>
        Object.freeze({
          commit: () => undefined,
          rollback: () => capture(() => sessionRef.current?.snapshot(owner)),
          dispose: () => undefined,
        }),
      read: () => {
        if (failRead) throw new Error('read failed');
        return Object.freeze({});
      },
      dispose: () => capture(() => sessionRef.current?.participant(participant)),
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant],
    });
    sessionRef.current = session;
    failRead = true;

    expect(() =>
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(owner, 2)] }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED' }));
    session.dispose();
    expect(reentryCodes).toEqual(['RUNTIME_SESSION_REENTRANT', 'RUNTIME_SESSION_REENTRANT']);
  });

  it('immutable read 与 candidate mutable state 无 alias，rollback 后旧 nested reference/content 不变', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let live = { values: [1] };
    let failFollower = false;
    const participant = defineRuntimeCommitParticipant({
      key: 'a-immutable',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const previous = live;
        const next = { values: [candidate.snapshot(owner).value] };
        return Object.freeze({
          commit: () => {
            live = next;
          },
          rollback: () => {
            live = previous;
          },
          dispose: () => undefined,
        });
      },
      read: () => Object.freeze({ values: Object.freeze([...live.values]) }),
      dispose: () => undefined,
    });
    const follower = defineRuntimeCommitParticipant({
      key: 'b-follower',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => {
        if (failFollower) throw new Error('follower failed');
        return Object.freeze({});
      },
      dispose: () => undefined,
    });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [participant, follower],
    });
    const oldRead = session.participant(participant);
    const oldValues = oldRead.values;
    expect(Object.isFrozen(oldRead)).toBe(true);
    expect(Object.isFrozen(oldValues)).toBe(true);
    expect(() => (oldValues as Array<number>).push(2)).toThrow();
    failFollower = true;

    expect(() =>
      session.update({ baseRevision: session.revision(), owners: [createRuntimeOwnerUpdate(owner, 2)] }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_READ_FAILED', owner: 'b-follower' }));
    expect(session.participant(participant)).toBe(oldRead);
    expect(session.participant(participant).values).toBe(oldValues);
    expect(oldRead).toEqual({ values: [1] });
    expect(live).toEqual({ values: [1] });
    session.dispose();
  });
});
