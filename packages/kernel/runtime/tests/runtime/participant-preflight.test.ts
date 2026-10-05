import { describe, expect, it, vi } from 'vitest';

import type { RuntimeCommitParticipant, RuntimeCommitParticipantToken } from '../../src';
import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeComputationRegistry,
  createRuntime,
  defineRuntimeCommitParticipant,
  defineRuntimeSource,
  RetikzRuntimeErrorCode,
} from '../../src';

const defineCounterSource = (key: string) =>
  defineRuntimeSource<number, number, number, never>({
    key,
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
  });

const defineParticipant = (
  key: string,
  sources: RuntimeCommitParticipantToken['sources'],
  onDispose: () => void = () => undefined,
) =>
  defineRuntimeCommitParticipant({
    key,
    sources,
    computations: [],
    revisionPolicy: 'affected',
    tracePhases: [],
    prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
    read: () => Object.freeze({ key }),
    dispose: onDispose,
  });

describe('runtime runtime participant preflight', () => {
  it('拒绝重复 key，且不触碰 executor', () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    let disposeCalls = 0;
    const first = defineParticipant('duplicate', [owner], () => {
      disposeCalls += 1;
    });
    const second = defineParticipant('duplicate', [owner], () => {
      disposeCalls += 1;
    });
    const base = { sources, computations, initialSnapshots: [createRuntimeSourceInput(owner, 1)] };

    expect(() => createRuntime({ ...base, participants: [first, second] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDuplicate }),
    );
    expect(disposeCalls).toBe(0);
  });

  it('拒绝 foreign module participant token', async () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    vi.resetModules();
    const { defineRuntimeCommitParticipant: defineForeignParticipant } = await import('../../src/participant/define');
    const foreign = defineForeignParticipant({
      key: 'foreign',
      sources: [owner],
      computations: [],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: () => Object.freeze({ commit: () => undefined, rollback: () => undefined, dispose: () => undefined }),
      read: () => Object.freeze({ key: 'foreign' }),
      dispose: () => undefined,
    });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
        participants: [foreign],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantTokenInvalid }));
  });

  it('拒绝 foreign 或重复 dependency，且 preflight 失败不消费 token', () => {
    const owner = defineCounterSource('counter');
    const foreign = defineCounterSource('foreign');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const invalid = defineParticipant('invalid', [foreign]);
    const duplicate = defineParticipant('duplicate-dependency', [owner, owner]);
    const base = { sources, computations, initialSnapshots: [createRuntimeSourceInput(owner, 1)] };

    expect(() => createRuntime({ ...base, participants: [invalid] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDependencyInvalid }),
    );
    expect(() => createRuntime({ ...base, participants: [duplicate] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDependencyInvalid }),
    );

    const validSources = createRuntimeSourceRegistry({ builtins: [foreign] });
    const validComputations = createRuntimeComputationRegistry({ sources: validSources });
    const runtime = createRuntime({
      sources: validSources,
      computations: validComputations,
      initialSnapshots: [createRuntimeSourceInput(foreign, 1)],
      participants: [invalid],
    });

    expect(runtime.participant(invalid)).toEqual({ key: 'invalid' });

    runtime.dispose();
  });

  it('fresh + already-owned 混合 preflight 不污染 fresh token', () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const owned = defineParticipant('z-owned', [owner]);
    const fresh = defineParticipant('a-fresh', [owner]);
    const create = (participants: ReadonlyArray<RuntimeCommitParticipantToken>) =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
        participants,
      });
    const first = create([owned]);

    expect(() => create([fresh, owned])).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantAlreadyOwned }),
    );

    const retry = create([fresh]);

    expect(retry.participant(fresh)).toEqual({ key: 'a-fresh' });

    retry.dispose();
    first.dispose();
  });

  it('合法但不属于当前 runtime 的 typed token 以 UNKNOWN 拒绝', () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const member = defineParticipant('member', [owner]);
    const foreign = defineParticipant('foreign', [owner]);
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      participants: [member],
    });

    expect(() => runtime.participant(foreign as RuntimeCommitParticipant<{ key: string }>)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantUnknown }),
    );

    runtime.dispose();
  });
});
