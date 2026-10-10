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
      result: {
        capture: value => Object.freeze({ value }),
        readForComputation: result => result.value,
        read: result => `sum:${result.value}`,
      },
      run: view => ({ kind: RuntimeComputationKind.Full, result: view.snapshot(owner).value }),
      update: (_previous, view) => ({ kind: RuntimeComputationKind.Incremental, result: view.snapshot(owner).value }),
      observeCommit: event => events.push(event),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(runtime.revision()).toBe(0);
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(runtime.result(computation)).toEqual({ revision: 0, value: 'sum:1' });
    expect(events).toEqual([
      expect.objectContaining({
        phase: RuntimeComputationPhase.Initial,
        revision: 0,
        outcome: RuntimeComputationKind.Full,
        result: { revision: 0, value: 'sum:1' },
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
    expect(runtime.result(computation)).toEqual({ revision: 1, value: 'sum:2' });
    expect(events.at(-1)).toEqual(
      expect.objectContaining({
        phase: RuntimeComputationPhase.Update,
        baseRevision: 0,
        revision: 1,
        outcome: RuntimeComputationKind.Incremental,
        result: { revision: 1, value: 'sum:2' },
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

  it.each(['sources', 'computations'])('创建后修改 $0 注册表不改变计算图和资源所有权', registry => {
    const released: Array<string> = [];
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: value => {
          released.push(`source:${value}`);
        },
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number>({
      id: { owner: 'counter', key: 'double' },
      sources: [owner],
      result: {
        dispose: value => {
          released.push(`result:${value}`);
        },
      },
      run: view => ({ kind: 'full', result: view.snapshot(owner).value * 2 }),
    });
    const computations = createRuntimeComputationRegistry({ sources, computations: [computation] });
    const options = { sources, computations, initialSnapshots: [createRuntimeSourceInput(owner, 1)] };
    const runtime = createRuntime(options);
    if (registry === 'sources') options.sources = createRuntimeSourceRegistry([]);
    else options.computations = createRuntimeComputationRegistry({ sources });
    expect(
      runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(owner, 2)] }),
    ).toEqual({
      revision: 1,
      outcome: 'full',
      diagnostics: [],
    });
    expect(runtime.result(computation)).toEqual({ revision: 1, value: 4 });
    runtime.dispose();
    expect(released).toEqual(['result:2', 'source:1', 'result:4', 'source:2']);
  });

  it('创建后替换注册表不漏掉初始资源释放', () => {
    const released: Array<number> = [];
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
        dispose: value => {
          released.push(value);
        },
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const options = {
      sources,
      computations: createRuntimeComputationRegistry({ sources }),
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    };
    const runtime = createRuntime(options);
    options.sources = createRuntimeSourceRegistry([]);
    runtime.dispose();
    expect(released).toEqual([1]);
  });

  it('Runtime 创建时固定 trace sink 引用', () => {
    const owner = defineCounterSource();
    const sources = createRuntimeSourceRegistry([owner]);
    const calls: Array<string> = [];
    const computation = defineRuntimeComputation<number>({
      id: { owner: 'counter', key: 'traced' },
      sources: [owner],
      tracePhases: [{ phase: 'update', unit: 'computation', outcomes: ['full'] }],
      run: (view, context) => {
        context.trace.report({
          phase: 'update',
          unit: 'computation',
          outcome: 'full',
          visited: 1,
          reused: 0,
          changed: 1,
        });
        return { kind: 'full', result: view.snapshot(owner).value };
      },
    });
    const options = {
      sources,
      computations: createRuntimeComputationRegistry({ sources, computations: [computation] }),
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      trace: () => {
        calls.push('original');
      },
    };
    const runtime = createRuntime(options);
    calls.length = 0;
    options.trace = () => {
      calls.push('replacement');
    };
    runtime.update({ baseRevision: runtime.revision(), sources: [createRuntimeSourceUpdate(owner, 2)] });
    expect(calls).toEqual(['original']);
    runtime.dispose();
  });
});
