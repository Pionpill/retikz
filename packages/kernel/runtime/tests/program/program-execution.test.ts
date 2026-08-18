import { describe, expect, it, vi } from 'vitest';

import { RuntimeDiagnosticCode } from '../../src';
import { defineRuntimeOwner } from '../../src/owner';
import {
  defineRuntimeProgram,
  RuntimeProgramExecution,
  RuntimeProgramKind,
  RuntimeProgramPhase,
} from '../../src/program';
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
  it('默认 auto 向 Program 暴露 initial full 与 incremental update execution', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const executions: Array<unknown> = [];
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'execution-default' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: (view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value };
      },
      update: (_previous, view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeProgramKind.Incremental, artifact: view.snapshot(owner).value };
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

    expect(result.outcome).toBe(RuntimeProgramKind.Incremental);
    expect(executions).toEqual([RuntimeProgramExecution.Full, RuntimeProgramExecution.Incremental]);
  });

  it('full strategy 跳过 Program update 并只以 full execution 调用 run', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const executions: Array<unknown> = [];
    const update = vi.fn(() => ({ kind: RuntimeProgramKind.Incremental, artifact: 999 }));
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'forced-full' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: (view, context) => {
        executions.push(context.execution);
        return { kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value };
      },
      update,
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      updateStrategy: 'full',
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeProgramKind.Full, diagnostics: [] });
    expect(update).not.toHaveBeenCalled();
    expect(executions).toEqual([RuntimeProgramExecution.Full, RuntimeProgramExecution.Full]);
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('CandidateView 精确区分同一 Program 已声明 owner 的实际变化', () => {
    const primaryOwner = defineCounterOwner('primary-changed');
    const stableOwner = defineCounterOwner('stable-owner');
    const owners = createRuntimeOwnerRegistry({ builtins: [primaryOwner, stableOwner] });
    const observations: Array<Readonly<[boolean, boolean]>> = [];
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'primary-changed', key: 'changed-observer' },
      owners: [primaryOwner, stableOwner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(primaryOwner).value }),
      update: (_previous, view) => {
        observations.push(Object.freeze([view.changed(primaryOwner), view.changed(stableOwner)]));
        return { kind: RuntimeProgramKind.Incremental, artifact: view.snapshot(primaryOwner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(primaryOwner, 1), createRuntimeOwnerInput(stableOwner, 7)],
    });

    session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(primaryOwner, 2)],
    });

    expect(observations).toEqual([[true, false]]);
  });

  it('只执行直接与传递失效分支，并复用无关 Program artifact', () => {
    const primaryOwner = defineCounterOwner('primary');
    const unrelatedOwner = defineCounterOwner('unrelated');
    const owners = createRuntimeOwnerRegistry({ builtins: [primaryOwner, unrelatedOwner] });
    const directRun = vi.fn(view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(primaryOwner).value }));
    const directCapture = vi.fn((value: number) => value);
    const directObserver = vi.fn();
    const directUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeProgramKind.Incremental,
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
      observeCommit: directObserver,
    });
    const transitiveRun = vi.fn(view => ({
      kind: RuntimeProgramKind.Full,
      artifact: view.artifact(direct).value * 10,
    }));
    const transitiveCapture = vi.fn((value: number) => value);
    const transitiveObserver = vi.fn();
    const transitiveUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeProgramKind.Incremental,
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
      observeCommit: transitiveObserver,
    });
    const unrelatedRun = vi.fn(view => ({
      kind: RuntimeProgramKind.Full,
      artifact: view.snapshot(unrelatedOwner).value,
    }));
    const unrelatedCapture = vi.fn((value: number) => value);
    const unrelatedObserver = vi.fn();
    const unrelatedUpdate = vi.fn((_previous: number, view) => ({
      kind: RuntimeProgramKind.Incremental,
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
      observeCommit: unrelatedObserver,
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
    expect(directObserver).toHaveBeenCalledTimes(2);
    expect(transitiveObserver).toHaveBeenCalledTimes(2);
    expect(unrelatedObserver).toHaveBeenCalledTimes(1);
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
    expect(directObserver).toHaveBeenCalledTimes(2);
    expect(transitiveObserver).toHaveBeenCalledTimes(2);
    expect(unrelatedObserver).toHaveBeenCalledTimes(2);
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
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => {
        hints.push(view.changeSet(owner));
        return { kind: RuntimeProgramKind.Incremental, artifact: view.snapshot(owner).value };
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

    expect(result.outcome).toBe(RuntimeProgramKind.Incremental);
    expect(hints).toEqual([undefined]);
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('owner 未提供领域 validator 时把 branded change hint 透传给 Program', () => {
    const owner = defineRuntimeOwner<number, number, number, { delta: number }>({
      key: 'program-validated',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const hints: Array<unknown> = [];
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'program-validated', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
      update: (_previous, view) => {
        hints.push(view.changeSet(owner));
        return { kind: RuntimeProgramKind.Incremental, artifact: view.snapshot(owner).value };
      },
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const baseRevision = session.revision();
    const changeSet = createRuntimeChangeSet(baseRevision, [{ delta: 1 }]);

    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(owner, 2, changeSet)],
    });

    expect(result).toEqual({ revision: 1, outcome: RuntimeProgramKind.Incremental, diagnostics: [] });
    expect(hints).toEqual([changeSet]);
  });

  it('invalid change hint 跳过 update、执行 full，并提交 fallback diagnostic', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const run = vi.fn(view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }));
    const update = vi.fn(() => ({ kind: RuntimeProgramKind.Incremental, artifact: 999 }));
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
      updateStrategy: 'full',
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const baseRevision = session.revision();

    const result = session.update({
      baseRevision,
      owners: [createRuntimeOwnerUpdate(owner, 2, createRuntimeChangeSet(baseRevision, [{ delta: 100 }]))],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(result.diagnostics).toEqual([
      expect.objectContaining({
        code: RuntimeDiagnosticCode.ChangeSetFallback,
        severity: 'warning',
        owner: 'counter',
      }),
    ]);
    expect(run).toHaveBeenCalledTimes(2);
    expect(update).not.toHaveBeenCalled();
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });
  });

  it('upstream full 强制 downstream full，不调用 downstream update', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const upstreamRun = vi.fn(view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }));
    const upstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'upstream' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: upstreamRun,
    });
    const downstreamExecutions: Array<unknown> = [];
    const downstreamRun = vi.fn((view, context) => {
      downstreamExecutions.push(context.execution);
      return { kind: RuntimeProgramKind.Full, artifact: view.artifact(upstream).value * 10 };
    });
    const downstreamUpdate = vi.fn((_previous, view) => ({
      kind: RuntimeProgramKind.Incremental,
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

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(owner, 2)],
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Full);
    expect(upstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(downstreamExecutions).toEqual([RuntimeProgramExecution.Full, RuntimeProgramExecution.Full]);
    expect(session.artifact(upstream)).toEqual({ revision: 1, value: 2 });
    expect(session.artifact(downstream)).toEqual({ revision: 1, value: 20 });
  });

  it('Program fallback 调用 full run并归属 warning；upstream bailout 不触发下游', () => {
    const owner = defineCounterOwner();
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const upstreamRun = vi.fn(view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }));
    const upstreamObserver = vi.fn();
    const upstreamUpdate = vi
      .fn()
      .mockReturnValueOnce({
        kind: RuntimeProgramKind.Fallback,
        diagnostics: [
          { code: 'PROGRAM_FALLBACK', phase: RuntimeProgramPhase.Update, message: 'incremental unavailable' },
        ],
      })
      .mockReturnValueOnce({ kind: RuntimeProgramKind.Bailout });
    const upstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'upstream' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: upstreamRun,
      update: upstreamUpdate,
      observeCommit: upstreamObserver,
    });
    const fallbackDownstreamExecutions: Array<unknown> = [];
    const downstreamRun = vi.fn((view, context) => {
      fallbackDownstreamExecutions.push(context.execution);
      return { kind: RuntimeProgramKind.Full, artifact: view.artifact(upstream).value * 10 };
    });
    const downstreamObserver = vi.fn();
    const downstreamUpdate = vi.fn((_previous, view) => ({
      kind: RuntimeProgramKind.Incremental,
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
      observeCommit: downstreamObserver,
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

    expect(fallback.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(fallback.diagnostics).toEqual([
      {
        code: 'PROGRAM_FALLBACK',
        phase: RuntimeProgramPhase.Update,
        severity: 'warning',
        message: 'incremental unavailable',
        owner: 'counter',
        program: { owner: 'counter', key: 'upstream' },
      },
    ]);
    expect(downstreamRun).toHaveBeenCalledTimes(2);
    expect(downstreamUpdate).not.toHaveBeenCalled();
    expect(fallbackDownstreamExecutions).toEqual([RuntimeProgramExecution.Full, RuntimeProgramExecution.Fallback]);
    expect(upstreamObserver).toHaveBeenCalledTimes(2);
    expect(downstreamObserver).toHaveBeenCalledTimes(2);
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
    expect(fallbackDownstreamExecutions).toEqual([RuntimeProgramExecution.Full, RuntimeProgramExecution.Fallback]);
    expect(upstreamObserver).toHaveBeenCalledTimes(2);
    expect(downstreamObserver).toHaveBeenCalledTimes(2);
  });
});
