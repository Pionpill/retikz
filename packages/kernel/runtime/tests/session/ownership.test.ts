import { describe, expect, it, vi } from 'vitest';

import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

describe('runtime session ownership', () => {
  it('equal candidate、已替换 current 与最终 current 均 exactly-once dispose', () => {
    const capturedOwners: Array<Readonly<{ value: number }>> = [];
    const capturedArtifacts: Array<Readonly<{ value: number }>> = [];
    const ownerDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const artifactDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const owner = defineRuntimeOwner<number, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedOwners.push(captured);
          return captured;
        },
        read: value => value.value,
        equals: (left, right) => left.value === right.value,
        dispose: ownerDispose,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedArtifacts.push(captured);
          return captured;
        },
        readForProgram: artifact => artifact.value,
        read: artifact => artifact.value,
        dispose: artifactDispose,
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: (_previous, view) => ({
        kind: 'incremental',
        artifact: view.snapshot(owner).value,
      }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 1)],
      }).outcome,
    ).toBe('bailout');
    expect(ownerDispose).toHaveBeenCalledTimes(1);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedOwners[1]);
    expect(artifactDispose).not.toHaveBeenCalled();

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }).outcome,
    ).toBe('incremental');
    expect(ownerDispose).toHaveBeenCalledTimes(2);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedOwners[1]);
    expect(ownerDispose.mock.calls.at(1)?.[0]).toBe(capturedOwners[0]);
    expect(artifactDispose).toHaveBeenCalledTimes(1);
    expect(artifactDispose.mock.calls.at(0)?.[0]).toBe(capturedArtifacts[0]);

    session.dispose();
    session.dispose();
    expect(ownerDispose).toHaveBeenCalledTimes(3);
    expect(ownerDispose.mock.calls.at(0)?.[0]).toBe(capturedOwners[1]);
    expect(ownerDispose.mock.calls.at(1)?.[0]).toBe(capturedOwners[0]);
    expect(ownerDispose.mock.calls.at(2)?.[0]).toBe(capturedOwners[2]);
    expect(artifactDispose).toHaveBeenCalledTimes(2);
    expect(artifactDispose.mock.calls.at(0)?.[0]).toBe(capturedArtifacts[0]);
    expect(artifactDispose.mock.calls.at(1)?.[0]).toBe(capturedArtifacts[1]);
  });

  it('fallback full artifact 替换后释放旧值，session dispose 释放新值', () => {
    const capturedArtifacts: Array<Readonly<{ value: number }>> = [];
    const artifactDispose = vi.fn<(value: Readonly<{ value: number }>) => void>();
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: value => {
          const captured = Object.freeze({ value });
          capturedArtifacts.push(captured);
          return captured;
        },
        readForProgram: artifact => artifact.value,
        read: artifact => artifact.value,
        dispose: artifactDispose,
      },
      run: view => ({ kind: 'full', artifact: view.snapshot(owner).value }),
      update: () => ({ kind: 'fallback' }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }).outcome,
    ).toBe('fallback');
    expect(artifactDispose).toHaveBeenCalledTimes(1);
    expect(artifactDispose.mock.calls.at(0)?.[0]).toBe(capturedArtifacts[0]);
    expect(session.artifact(program)).toEqual({ revision: 1, value: 2 });

    session.dispose();
    expect(artifactDispose).toHaveBeenCalledTimes(2);
    expect(artifactDispose.mock.calls.at(1)?.[0]).toBe(capturedArtifacts[1]);
  });
});
