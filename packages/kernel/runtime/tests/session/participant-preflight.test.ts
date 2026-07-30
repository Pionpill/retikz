import { describe, expect, it } from 'vitest';

import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken, RuntimeSessionOptions } from '../../src';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
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

const defineParticipant = (
  key: string,
  owners: RuntimeCommitParticipantToken['owners'],
  onDispose: () => void = () => undefined,
) =>
  defineRuntimeCommitParticipant({
    key,
    owners,
    programs: [],
    revisionPolicy: 'affected',
    tracePhases: [],
    prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
    read: () => Object.freeze({ key }),
    dispose: onDispose,
  });

describe('runtime session participant preflight', () => {
  it('拒绝非数组 options、伪 token 与重复 key，且不触碰 executor', () => {
    const owner = defineCounterOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    let disposeCalls = 0;
    const first = defineParticipant('duplicate', [owner], () => {
      disposeCalls += 1;
    });
    const second = defineParticipant('duplicate', [owner], () => {
      disposeCalls += 1;
    });
    const base = { owners, programs, initialSnapshots: [createRuntimeOwnerInput(owner, 1)] };

    expect(() => createRuntimeSession({ ...base, participants: {} } as unknown as RuntimeSessionOptions)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_TOKEN_INVALID' }),
    );
    expect(() => createRuntimeSession({ ...base, participants: [{} as RuntimeCommitParticipantToken] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_TOKEN_INVALID' }),
    );
    expect(() => createRuntimeSession({ ...base, participants: [first, second] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DUPLICATE' }),
    );
    expect(disposeCalls).toBe(0);
  });

  it('拒绝 foreign 或重复 dependency，且 preflight 失败不消费 token', () => {
    const owner = defineCounterOwner('counter');
    const foreign = defineCounterOwner('foreign');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const invalid = defineParticipant('invalid', [foreign]);
    const duplicate = defineParticipant('duplicate-dependency', [owner, owner]);
    const base = { owners, programs, initialSnapshots: [createRuntimeOwnerInput(owner, 1)] };

    expect(() => createRuntimeSession({ ...base, participants: [invalid] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DEPENDENCY_INVALID' }),
    );
    expect(() => createRuntimeSession({ ...base, participants: [duplicate] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_DEPENDENCY_INVALID' }),
    );

    const validOwners = createRuntimeOwnerRegistry({ builtins: [foreign] });
    const validPrograms = createRuntimeProgramRegistry({ owners: validOwners });
    const session = createRuntimeSession({
      owners: validOwners,
      programs: validPrograms,
      initialSnapshots: [createRuntimeOwnerInput(foreign, 1)],
      participants: [invalid],
    });
    expect(session.participant(invalid)).toEqual({ key: 'invalid' });
    session.dispose();
  });

  it('fresh + already-owned 混合 preflight 不污染 fresh token', () => {
    const owner = defineCounterOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const owned = defineParticipant('z-owned', [owner]);
    const fresh = defineParticipant('a-fresh', [owner]);
    const create = (participants: ReadonlyArray<RuntimeCommitParticipantToken>) =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
        participants,
      });
    const first = create([owned]);

    expect(() => create([fresh, owned])).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_ALREADY_OWNED' }),
    );

    const retry = create([fresh]);
    expect(retry.participant(fresh)).toEqual({ key: 'a-fresh' });
    retry.dispose();
    first.dispose();
  });

  it('合法但不属于当前 session 的 typed token 以 UNKNOWN 拒绝', () => {
    const owner = defineCounterOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const member = defineParticipant('member', [owner]);
    const foreign = defineParticipant('foreign', [owner]);
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants: [member],
    });

    expect(() => session.participant(foreign as RuntimeCommitParticipant<{ key: string }>)).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_PARTICIPANT_UNKNOWN' }),
    );
    session.dispose();
  });
});
