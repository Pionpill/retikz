import { describe, expect, it } from 'vitest';

import type { RuntimeCommitEvent } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind, RuntimeComputationPhase } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeChangeSet, createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineCounterSource = () =>
  defineRuntimeSource<number, number, number, { delta: number }>({
    key: 'counter',
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
    validateChangeSet: (previous, next, changeSet) =>
      previous + changeSet.changes.reduce((sum, change) => sum + change.delta, 0) === next ? 'valid' : 'fallback',
  });

describe('runtime runtime lifecycle', () => {
  it('initial full 发布 revision 0，并在 incremental update 后原子推进 Snapshot', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const events: Array<RuntimeCommitEvent<string>> = [];
    const computation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, string>({
      id: { owner: 'counter', key: 'sum' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: value => Object.freeze({ value }),
        readForComputation: artifact => artifact.value,
        read: artifact => `sum:${artifact.value}`,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeComputationKind.Incremental, artifact: view.snapshot(owner).value }),
      observeCommit: event => events.push(event),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(runtime.artifact(computation)).toEqual({ revision: 0, value: 'sum:1' });
    expect(events).toEqual([
      expect.objectContaining({
        phase: RuntimeComputationPhase.Initial,
        revision: 0,
        outcome: RuntimeComputationKind.Full,
        artifact: { revision: 0, value: 'sum:1' },
        diagnostics: [],
      }),
    ]);

    const baseRevision = runtime.revision();
    const result = runtime.update({
      baseRevision,
      sources: [createRuntimeSourceUpdate(owner, 2, createRuntimeChangeSet(baseRevision, [{ delta: 1 }]))],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeComputationKind.Incremental, diagnostics: [] });
    expect(runtime.revision()).toBe(1);
    expect(runtime.snapshot(owner)).toEqual({ revision: 1, value: 2 });
    expect(runtime.artifact(computation)).toEqual({ revision: 1, value: 'sum:2' });
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        phase: RuntimeComputationPhase.Update,
        baseRevision: 0,
        revision: 1,
        outcome: RuntimeComputationKind.Incremental,
        artifact: { revision: 1, value: 'sum:2' },
        diagnostics: [],
      }),
    );
  });

  it('empty 与 semantic-equal update bailout，空 Computation graph 仍提交 owner Snapshot', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(runtime.update({ baseRevision: runtime.revision(), sources: [] })).toEqual({
      revision: 0,
      outcome: RuntimeComputationKind.Bailout,
      diagnostics: [],
    });
    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 1)],
      }),
    ).toEqual({ revision: 0, outcome: RuntimeComputationKind.Bailout, diagnostics: [] });

    const result = runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(result).toEqual({ revision: 1, outcome: 'committed', diagnostics: [] });
    expect(runtime.snapshot(owner)).toEqual({ revision: 1, value: 2 });
  });
});
