import { describe, expect, it } from 'vitest';

import type { RuntimeCommitEvent } from '../../src/program';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram, RuntimeProgramKind, RuntimeProgramPhase } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeChangeSet, createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const defineCounterOwner = () =>
  defineRuntimeOwner<number, number, number, { delta: number }>({
    key: 'counter',
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
    validateChangeSet: (previous, next, changeSet) =>
      previous + changeSet.changes.reduce((sum, change) => sum + change.delta, 0) === next ? 'valid' : 'fallback',
  });

describe('runtime session lifecycle', () => {
  it('initial full 发布 revision 0，并在 incremental update 后原子推进 Snapshot', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const events: Array<RuntimeCommitEvent<string>> = [];
    const program = defineRuntimeProgram<number, Readonly<{ value: number }>, number, string>({
      id: { owner: 'counter', key: 'sum' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => Object.freeze({ value }),
        readForProgram: artifact => artifact.value,
        read: artifact => `sum:${artifact.value}`,
      },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeProgramKind.Incremental, artifact: view.snapshot(owner).value }),
      observeCommit: event => events.push(event),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(session.revision()).toBe(0);
    expect(session.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(session.artifact(program)).toEqual({ revision: 0, value: 'sum:1' });
    expect(events).toEqual([
      expect.objectContaining({
        phase: RuntimeProgramPhase.Initial,
        revision: 0,
        outcome: RuntimeProgramKind.Full,
        artifact: { revision: 0, value: 'sum:1' },
        diagnostics: [],
      }),
    ]);

    const baseRevision = session.revision();
    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(owner, 2, createRuntimeChangeSet(baseRevision, [{ delta: 1 }]))],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeProgramKind.Incremental, diagnostics: [] });
    expect(session.revision()).toBe(1);
    expect(session.snapshot(owner)).toEqual({ revision: 1, value: 2 });
    expect(session.artifact(program)).toEqual({ revision: 1, value: 'sum:2' });
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        phase: RuntimeProgramPhase.Update,
        baseRevision: 0,
        revision: 1,
        outcome: RuntimeProgramKind.Incremental,
        artifact: { revision: 1, value: 'sum:2' },
        diagnostics: [],
      }),
    );
  });

  it('empty 与 semantic-equal update bailout，空 Program graph 仍提交 owner Snapshot', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(session.update({ baseRevision: session.revision(), owners: [] })).toEqual({
      revision: 0,
      outcome: RuntimeProgramKind.Bailout,
      diagnostics: [],
    });
    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 1)],
      }),
    ).toEqual({ revision: 0, outcome: RuntimeProgramKind.Bailout, diagnostics: [] });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result).toEqual({ revision: 1, outcome: 'committed', diagnostics: [] });
    expect(session.snapshot(owner)).toEqual({ revision: 1, value: 2 });
  });
});
