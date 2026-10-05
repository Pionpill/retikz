import { describe, expect, it } from 'vitest';

import {
  createRuntimeSourceInput,
  createRuntimeSourceRegistry,
  createRuntimeSourceUpdate,
  createRuntimeComputationRegistry,
  createRuntime,
  defineRuntimeCommitParticipant,
  defineRuntimeSource,
  defineRuntimeComputation,
  RetikzRuntimeErrorCode,
  RuntimeComputationKind,
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

describe('runtime runtime participant revision policy', () => {
  it('participants omitted 与显式空数组严格保持既有 runtime 行为', () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const base = { sources, computations, initialSnapshots: [createRuntimeSourceInput(owner, 1)] };
    const omitted = createRuntime(base);
    const explicit = createRuntime({ ...base, participants: [] });

    const omittedResult = omitted.update({
      baseRevision: omitted.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });
    const explicitResult = explicit.update({
      baseRevision: explicit.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(explicitResult).toEqual(omittedResult);
    expect(explicit.snapshot(owner)).toEqual(omitted.snapshot(owner));

    omitted.dispose();
    explicit.dispose();
  });

  it('affected participant 在声明 Computation 产生新 artifact 时执行并读取 candidate public artifact', () => {
    const owner = defineCounterSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computation = defineRuntimeComputation<number, number, number, Readonly<{ value: number }>>({
      id: { owner: 'counter', key: 'artifact' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: value => value,
        readForComputation: value => value,
        read: value => Object.freeze({ value }),
      },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeComputationKind.Incremental, artifact: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const preparedValues: Array<number> = [];
    let committed: Readonly<{ value: number }> = Object.freeze({ value: -1 });
    const participant = defineRuntimeCommitParticipant({
      key: 'artifact-consumer',
      sources: [],
      computations: [computation],
      revisionPolicy: 'affected',
      tracePhases: [],
      prepare: candidate => {
        const previous = committed;
        const next = candidate.artifact(computation).value;
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
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      participants: [participant],
    });
    preparedValues.length = 0;

    runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(owner, 2)],
    });

    expect(preparedValues).toEqual([2]);
    expect(runtime.participant(participant)).toEqual({ value: 2 });

    runtime.dispose();
  });

  it('affected 只响应声明依赖，continuous 响应每个非 bailout commit', () => {
    const primary = defineCounterSource('primary');
    const unrelated = defineCounterSource('unrelated');
    const sources = createRuntimeSourceRegistry({ builtins: [primary, unrelated] });
    const computations = createRuntimeComputationRegistry({ sources });
    const affectedCalls: Array<number> = [];
    const continuousCalls: Array<number> = [];

    const define = (key: string, revisionPolicy: 'affected' | 'continuous', calls: Array<number>) => {
      let read: Readonly<{ revision: number }> = Object.freeze({ revision: -1 });
      return defineRuntimeCommitParticipant({
        key,
        sources: [primary],
        computations: [],
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
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(primary, 1), createRuntimeSourceInput(unrelated, 1)],
      participants: [continuous, affected],
    });
    affectedCalls.length = 0;
    continuousCalls.length = 0;
    const oldAffectedRead = runtime.participant(affected);

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(unrelated, 2)],
      }).outcome,
    ).toBe('committed');
    expect(affectedCalls).toEqual([]);
    expect(continuousCalls).toEqual([1]);
    expect(runtime.participant(affected)).toBe(oldAffectedRead);

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(unrelated, 2)],
      }).outcome,
    ).toBe(RuntimeComputationKind.Bailout);
    expect(continuousCalls).toEqual([1]);

    runtime.update({
      baseRevision: runtime.revision(),
      sources: [createRuntimeSourceUpdate(primary, 2)],
    });

    expect(affectedCalls).toEqual([2]);
    expect(continuousCalls).toEqual([1, 2]);

    runtime.dispose();
  });

  it('forced full 下 continuous participant 每个 revision 只推进一次', () => {
    const owner = defineCounterSource('forced-full');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'forced-full', key: 'artifact' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: value => value,
        readForComputation: value => value,
        read: value => value,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeComputationKind.Incremental, artifact: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const preparedRevisions: Array<number> = [];
    const committedRevisions: Array<number> = [];
    const participant = defineRuntimeCommitParticipant({
      key: 'forced-full-continuous',
      sources: [],
      computations: [computation],
      revisionPolicy: 'continuous',
      tracePhases: [],
      prepare: candidate => {
        preparedRevisions.push(candidate.candidateRevision);
        return Object.freeze({
          commit: () => {
            committedRevisions.push(candidate.candidateRevision);
          },
          rollback: () => undefined,
          dispose: () => undefined,
        });
      },
      read: () => Object.freeze({}),
      dispose: () => undefined,
    });
    const runtime = createRuntime({
      sources,
      computations,
      updateStrategy: 'full',
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      participants: [participant],
    });
    preparedRevisions.length = 0;
    committedRevisions.length = 0;

    expect(
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }),
    ).toEqual({ revision: 1, outcome: RuntimeComputationKind.Full, diagnostics: [] });
    expect(preparedRevisions).toEqual([1]);
    expect(committedRevisions).toEqual([1]);

    runtime.dispose();
  });

  it('runtime dispose failure 不阻断反向 cleanup，并只重试失败 participant', () => {
    let ownerDisposeCalls = 0;
    let artifactDisposeCalls = 0;
    const owner = defineRuntimeSource<number, number, number, never>({
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
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'artifact' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: value => value,
        readForComputation: value => value,
        read: value => value,
        dispose: () => {
          artifactDisposeCalls += 1;
        },
      },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const calls: Array<string> = [];
    const trigger = new Error('dispose failed');

    const define = (key: string, failCount: number) => {
      let remainingFailures = failCount;
      return defineRuntimeCommitParticipant({
        key,
        sources: [owner],
        computations: [],
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
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      participants: [first, second],
    });

    expect(() => runtime.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
    expect(runtime.diagnostics()).toEqual([
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDisposeFailed, cause: trigger, owner: 'b' }),
      expect.objectContaining({ code: RetikzRuntimeErrorCode.ParticipantDisposeFailed, cause: trigger, owner: 'b' }),
    ]);
    expect(() => runtime.participant(first)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Disposed }),
    );
    expect(() => runtime.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
    expect(runtime.diagnostics()).toEqual([]);
    expect(() => runtime.dispose()).not.toThrow();
    expect(calls).toEqual(['b', 'a', 'b', 'b']);
    expect(ownerDisposeCalls).toBe(1);
    expect(artifactDisposeCalls).toBe(1);
  });
});
