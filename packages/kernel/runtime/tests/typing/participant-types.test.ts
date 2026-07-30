import { describe, expectTypeOf, it } from 'vitest';

import type { RuntimeCommitParticipantToken } from '../../src';

import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  defineRuntimeCommitParticipant,
  defineRuntimeOwner,
} from '../../src';

describe('runtime participant public typing', () => {
  it('异构 token 数组被擦除，session.participant 恢复各自 read 类型', () => {
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const numberParticipant = defineRuntimeCommitParticipant({
      key: 'number',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => 1,
      dispose: () => undefined,
    });
    const objectParticipant = defineRuntimeCommitParticipant({
      key: 'object',
      owners: [owner],
      programs: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => Object.freeze({ value: 'ready' as const }),
      dispose: () => undefined,
    });
    const participants: ReadonlyArray<RuntimeCommitParticipantToken> = [numberParticipant, objectParticipant];
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      participants,
    });

    expectTypeOf(session.participant(numberParticipant)).toEqualTypeOf<number>();
    expectTypeOf(session.participant(objectParticipant)).toEqualTypeOf<Readonly<{ value: 'ready' }>>();
    session.dispose();
  });
});
