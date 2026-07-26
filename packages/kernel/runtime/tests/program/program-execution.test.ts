import { describe, expect, it, vi } from 'vitest';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeChangeSet, createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const defineCounterOwner = (key = 'counter') =>
  defineRuntimeOwner<number, number, number, { delta: number }>({
    key,
    value: {
      capture: value => value,
      read: value => value,
      equals: (left, right) => left === right,
    },
    validateChangeSet: (previous, next, changeSet) =>
      previous + changeSet.changes.reduce((sum, change) => sum + change.delta, 0) === next ? 'valid' : 'fallback',
  });

describe('runtime Program execution', () => {
  it('只执行直接与传递失效分支，并复用无关 Program artifact', () => {
    const primaryOwner = defineCounterOwner('primary');
    const unrelatedOwner = defineCounterOwner('unrelated');
    const owners = createRuntimeOwnerRegistry({ builtins: [primaryOwner, unrelatedOwner] });
    const directRun = vi.fn(view => ({ kind: 'full' as const, artifact: view.snapshot(primaryOwner).value }));
    const directCapture = vi.fn((value: number) => value);
    const directUpdate = vi.fn((_previous: number, view) => ({
      kind: 'incremental' as const,
      artifact: view.snapshot(primaryOwner).value,
    }));
    const direct = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'primary', key: 'direct' },
      owners: [primaryOwner],
      programs: [],
      tracePhases: [],
      artifact: { capture: directCapture, readForProgram: value => value, read: value => value },
      run: directRun,
      update: directUpdate,
    });
    const transitiveRun = vi.fn(view => ({ kind: 'full' as const, artifact: view.artifact(direct).value * 10 }));
    const transitiveCapture = vi.fn((value: number) => value);
    const transitiveUpdate = vi.fn((_previous: number, view) => ({
      kind: 'incremental' as const,
      artifact: view.artifact(direct).value * 10,
    }));
    const transitive = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'primary', key: 'transitive' },
      owners: [],
      programs: [direct],
      tracePhases: [],
      artifact: { capture: transitiveCapture, readForProgram: value => value, read: value => value },
      run: transitiveRun,
      update: transitiveUpdate,
    });
    const unrelatedRun = vi.fn(view => ({ kind: 'full' as const, artifact: view.snapshot(unrelatedOwner).value }));
    const unrelatedCapture = vi.fn((value: number) => value);
    const unrelatedUpdate = vi.fn((_previous: number, view) => ({
      kind: 'incremental' as const,
      artifact: view.snapshot(unrelatedOwner).value,
    }));
    const unrelated = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'unrelated', key: 'isolated' },
      owners: [unrelatedOwner],
      programs: [],
      tracePhases: [],
      artifact: { capture: unrelatedCapture, readForProgram: value => value, read: value => value },
      run: unrelatedRun,
      update: unrelatedUpdate,
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [transitive, unrelated, direct] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(primaryOwner, 1), createRuntimeOwnerInput(unrelatedOwner, 7)],
    });

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(primaryOwner, 2)],
    });

    expect(directUpdate).toHaveBeenCalledTimes(1);
    expect(transitiveUpdate).toHaveBeenCalledTimes(1);
    expect(unrelatedUpdate).not.toHaveBeenCalled();
    expect(directRun).toHaveBeenCalledTimes(1);
    expect(transitiveRun).toHaveBeenCalledTimes(1);
    expect(unrelatedRun).toHaveBeenCalledTimes(1);
    expect(directCapture).toHaveBeenCalledTimes(2);
    expect(transitiveCapture).toHaveBeenCalledTimes(2);
    expect(unrelatedCapture).toHaveBeenCalledTimes(1);
    expect(session.artifact(direct)).toEqual({ revision: 1, value: 2 });
    expect(session.artifact(transitive)).toEqual({ revision: 1, value: 20 });
    expect(session.artifact(unrelated)).toEqual({ revision: 1, value: 7 });

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(unrelatedOwner, 8)],
    });

    expect(directUpdate).toHaveBeenCalledTimes(1);
    expect(transitiveUpdate).toHaveBeenCalledTimes(1);
    expect(unrelatedUpdate).toHaveBeenCalledTimes(1);
    expect(directRun).toHaveBeenCalledTimes(1);
    expect(transitiveRun).toHaveBeenCalledTimes(1);
    expect(unrelatedRun).toHaveBeenCalledTimes(1);
    expect(directCapture).toHaveBeenCalledTimes(2);
    expect(transitiveCapture).toHaveBeenCalledTimes(2);
    expect(unrelatedCapture).toHaveBeenCalledTimes(2);
    expect(session.artifact(direct)).toEqual({ revision: 2, value: 2 });
    expect(session.artifact(transitive)).toEqual({ revision: 2, value: 20 });
    expect(session.artifact(unrelated)).toEqual({ revision: 2, value: 8 });
  });

  it('缺少 change hint 时仍调用 update，并向 CandidateView 暴露 undefined', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const hints: Array<unknown> = [];
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view) => {
        hints.push(view.changeSet(owner));
        return { kind: 'incremental', artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result.outcome).toBe('incremental');
    expect(hints).toEqual([undefined]);
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('invalid change hint 跳过 update、执行 full，并提交 fallback diagnostic', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const run = vi.fn(view => ({ kind: 'full' as const, artifact: view.snapshot(owner).value }));
    const update = vi.fn(() => ({ kind: 'incremental' as const, artifact: 999 }));
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run,
      update,
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const baseRevision = session.revision();

    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(owner, 2, createRuntimeChangeSet(baseRevision, [{ delta: 100 }]))],
    });

    expect(result.outcome).toBe('fallback');
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: 'RUNTIME_CHANGESET_FALLBACK',
        severity: 'warning',
        owner: 'counter',
      }),
    ]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('Program fallback 调用 full run并归属 warning；upstream bailout 不触发下游', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const upstreamRun = vi.fn(view => ({ kind: 'full' as const, artifact: view.snapshot(owner).value }));
    const upstreamUpdate = vi
      .fn()
      .mockReturnValueOnce({
        kind: 'fallback',
        diagnostics: [{ code: 'PROGRAM_FALLBACK', phase: 'update', message: 'incremental unavailable' }],
      })
      .mockReturnValueOnce({ kind: 'bailout' });
    const upstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'upstream' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: upstreamRun,
      update: upstreamUpdate,
    });
    const downstreamRun = vi.fn(view => ({ kind: 'full' as const, artifact: view.artifact(upstream).value * 10 }));
    const downstreamUpdate = vi.fn((_previous, view) => ({
      kind: 'incremental' as const,
      artifact: view.artifact(upstream).value * 10,
    }));
    const downstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'downstream' },
      owners: [],
      programs: [upstream],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: downstreamRun,
      update: downstreamUpdate,
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [downstream, upstream] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const fallback = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(fallback.outcome).toBe('fallback');
    expect(fallback.diagnostics).toEqual([
      {
        code: 'PROGRAM_FALLBACK',
        phase: 'update',
        severity: 'warning',
        message: 'incremental unavailable',
        owner: 'counter',
        program: { owner: 'counter', key: 'upstream' },
      },
    ]);
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(session.artifact(downstream)).toEqual({ revision: 1, value: 20 });

    const bailout = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 3)],
    });

    expect(bailout.outcome).toBe('committed');
    expect(upstreamUpdate).toHaveBeenCalledTimes(2);
    expect(session.artifact(upstream)).toEqual({ revision: 2, value: 2 });
    expect(session.artifact(downstream)).toEqual({ revision: 2, value: 20 });
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
  });
});
