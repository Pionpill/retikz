import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import type { RuntimeSourceUpdate } from '../../src/transaction';
import { createRuntimeChangeSet, createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineSource = (key: string, capture = (value: number) => value) =>
  defineRuntimeSource<number, number, number, never>({
    key,
    value: { capture, read: value => value, equals: (left, right) => left === right },
  });

describe('runtime runtime validation', () => {
  it('在 capture 前拒绝 Computation/Source registry identity mismatch', () => {
    const capture = vi.fn((value: number) => value);
    const owner = defineSource('counter', capture);
    const computationSources = createRuntimeSourceRegistry({ builtins: [owner] });
    const runtimeSources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources: computationSources });

    expect(() =>
      createRuntime({
        sources: runtimeSources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.RegistryMismatch }));
    expect(capture).not.toHaveBeenCalled();
  });

  it('初始 commands 必须精确覆盖 source registry', () => {
    const first = defineSource('first');
    const second = defineSource('second');
    const sources = createRuntimeSourceRegistry({ builtins: [first, second] });
    const computations = createRuntimeComputationRegistry({ sources });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(first, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.InitialSourceMismatch }));
    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(first, 1), createRuntimeSourceInput(first, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.InitialSourceMismatch }));
  });

  it('按固定顺序拒绝 stale base、伪 command 与 mismatched ChangeSet base', () => {
    const capture = vi.fn((value: number) => value);
    const owner = defineSource('counter', capture);
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });
    const forged = { owner, kind: 'update' } as unknown as RuntimeSourceUpdate;

    expect(() =>
      runtime.update({
        baseRevision: 1 as ReturnType<typeof runtime.revision>,
        sources: [forged],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.RevisionStale }));
    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [forged],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceCommandInvalid }));
    const mismatched = createRuntimeSourceUpdate(
      owner,
      2,
      createRuntimeChangeSet(1 as ReturnType<typeof runtime.revision>, []),
    );
    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [mismatched, forged],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceCommandInvalid }));
    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [mismatched, createRuntimeSourceUpdate(owner, 3)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceCommandInvalid }));
    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [mismatched],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ChangeSetRevisionMismatch }));
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('CandidateView 拒绝未声明 owner dependency', () => {
    const declared = defineSource('declared');
    const hidden = defineSource('hidden');
    const sources = createRuntimeSourceRegistry({ builtins: [declared, hidden] });
    const computation = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'declared', key: 'computation' },
      sources: [declared],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(hidden).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(declared, 1), createRuntimeSourceInput(hidden, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.UndeclaredDependency }));
  });

  it('CandidateView 拒绝读取已注册但未声明的 Computation artifact', () => {
    const owner = defineSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const upstream = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'a-upstream' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
    });
    const hiddenReader = defineRuntimeComputation<number, number, number, number>({
      id: { owner: 'counter', key: 'b-hidden-reader' },
      sources: [],
      computations: [],
      tracePhases: [],
      artifact: { capture: value => value, readForComputation: value => value, read: value => value },
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.artifact(upstream).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [hiddenReader, upstream] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.UndeclaredDependency }));
  });

  it('重复 dispose no-op，并在 disposed 后拒绝 read/update', () => {
    const owner = defineSource('counter');
    const sources = createRuntimeSourceRegistry({ builtins: [owner] });
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    runtime.dispose();
    expect(() => runtime.snapshot(owner)).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Disposed }),
    );
    expect(() => runtime.update({ baseRevision: runtime.revision(), sources: [] })).toThrowError(
      expect.objectContaining({ code: RetikzRuntimeErrorCode.Disposed }),
    );
    expect(runtime.revision()).toBe(0);
    expect(() => runtime.dispose()).not.toThrow();
  });
});
