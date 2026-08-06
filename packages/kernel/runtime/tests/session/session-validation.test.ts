import { describe, expect, it, vi } from 'vitest';

import type { RuntimeOwnerUpdate } from '../../src/transaction';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram, RuntimeProgramKind } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeChangeSet, createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const defineOwner = (key: string, capture = (value: number) => value) =>
  defineRuntimeOwner<number, number, number, never>({
    key,
    value: { capture, read: value => value, equals: (left, right) => left === right },
  });

describe('runtime session validation', () => {
  it('在 capture 前拒绝 Program/Owner registry identity mismatch', () => {
    const capture = vi.fn((value: number) => value);
    const owner = defineOwner('counter', capture);
    const programOwners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const sessionOwners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners: programOwners });

    expect(() =>
      createRuntimeSession({
        owners: sessionOwners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_REGISTRY_MISMATCH' }));
    expect(capture).not.toHaveBeenCalled();
  });

  it('初始 commands 必须精确覆盖 owner registry', () => {
    const first = defineOwner('first');
    const second = defineOwner('second');
    const owners = createRuntimeOwnerRegistry({ builtins: [first, second] });
    const programs = createRuntimeProgramRegistry({ owners });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(first, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_INITIAL_OWNER_MISMATCH' }));
    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(first, 1), createRuntimeOwnerInput(first, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_INITIAL_OWNER_MISMATCH' }));
  });

  it('按固定顺序拒绝 stale base、伪 command 与 mismatched ChangeSet base', () => {
    const capture = vi.fn((value: number) => value);
    const owner = defineOwner('counter', capture);
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });
    const forged = { owner, kind: 'update' } as unknown as RuntimeOwnerUpdate;

    expect(() =>
      session.update({
        baseRevision: 1 as ReturnType<typeof session.revision>,
        owners: [forged],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_REVISION_STALE' }));
    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [forged],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }));
    const mismatched = createRuntimeOwnerUpdate(
      owner,
      2,
      createRuntimeChangeSet(1 as ReturnType<typeof session.revision>, []),
    );
    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [mismatched, forged],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }));
    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [mismatched, createRuntimeOwnerUpdate(owner, 3)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_OWNER_COMMAND_INVALID' }));
    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [mismatched],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_CHANGESET_REVISION_MISMATCH' }));
    expect(capture).toHaveBeenCalledTimes(1);
  });

  it('CandidateView 拒绝未声明 owner dependency', () => {
    const declared = defineOwner('declared');
    const hidden = defineOwner('hidden');
    const owners = createRuntimeOwnerRegistry({ builtins: [declared, hidden] });
    const program = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'declared', key: 'program' },
      owners: [declared],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(hidden).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(declared, 1), createRuntimeOwnerInput(hidden, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_UNDECLARED_DEPENDENCY' }));
  });

  it('CandidateView 拒绝读取已注册但未声明的 Program artifact', () => {
    const owner = defineOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const upstream = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'a-upstream' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
    });
    const hiddenReader = defineRuntimeProgram<number, number, number, number>({
      id: { owner: 'counter', key: 'b-hidden-reader' },
      owners: [],
      programs: [],
      tracePhases: [],
      artifact: { capture: value => value, readForProgram: value => value, read: value => value },
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.artifact(upstream).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [hiddenReader, upstream] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
      }),
    ).toThrowError(expect.objectContaining({ code: 'RUNTIME_UNDECLARED_DEPENDENCY' }));
  });

  it('重复 dispose no-op，并在 disposed 后拒绝 read/update', () => {
    const owner = defineOwner('counter');
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    session.dispose();
    expect(() => session.snapshot(owner)).toThrowError(expect.objectContaining({ code: 'RUNTIME_SESSION_DISPOSED' }));
    expect(() => session.update({ baseRevision: session.revision(), owners: [] })).toThrowError(
      expect.objectContaining({ code: 'RUNTIME_SESSION_DISPOSED' }),
    );
    expect(session.revision()).toBe(0);
    expect(() => session.dispose()).not.toThrow();
  });
});
