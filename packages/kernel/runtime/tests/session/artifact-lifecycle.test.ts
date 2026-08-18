import { describe, expect, it, vi } from 'vitest';

import type { RuntimeProgramArtifactDefinitionInput } from '../../src/program';

import { RetikzRuntimeErrorCode } from '../../src';
import { defineRuntimeOwner } from '../../src/owner';
import { defineRuntimeProgram, RuntimeProgramKind } from '../../src/program';
import { createRuntimeOwnerRegistry, createRuntimeProgramRegistry } from '../../src/registry';
import { createRuntimeSession } from '../../src/session';
import { createRuntimeOwnerInput, createRuntimeOwnerUpdate } from '../../src/transaction';

const defineOwner = (dispose = vi.fn()) =>
  defineRuntimeOwner<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
    key: 'counter',
    value: {
      capture: input => input,
      read: input => input.value,
      equals: (left, right) => left.value === right.value,
      dispose,
    },
  });

type Artifact = Readonly<{ value: number }>;
type ArtifactDefinition = RuntimeProgramArtifactDefinitionInput<number, Artifact, number, number>;

describe('runtime Program artifact lifecycle', () => {
  const failureCases: ReadonlyArray<{
    name: string;
    expectedCode: string;
    expectedPhase: string;
    artifact: (cause: Error, dispose: (artifact: Artifact) => void) => ArtifactDefinition;
    expectedDisposeCount: number;
  }> = [
    {
      name: 'capture',
      expectedCode: RetikzRuntimeErrorCode.ArtifactCaptureFailed,
      expectedPhase: 'artifact-capture',
      artifact: (cause: Error, dispose: (artifact: Artifact) => void) => ({
        capture: () => {
          throw cause;
        },
        readForProgram: (value: Readonly<{ value: number }>) => value.value,
        read: (value: Readonly<{ value: number }>) => value.value,
        dispose,
      }),
      expectedDisposeCount: 0,
    },
    {
      name: 'private read',
      expectedCode: RetikzRuntimeErrorCode.ArtifactProgramReadFailed,
      expectedPhase: 'artifact-program-read',
      artifact: (cause: Error, dispose: (artifact: Artifact) => void) => ({
        capture: (value: number) => Object.freeze({ value }),
        readForProgram: () => {
          throw cause;
        },
        read: (value: Readonly<{ value: number }>) => value.value,
        dispose,
      }),
      expectedDisposeCount: 1,
    },
    {
      name: 'public read',
      expectedCode: RetikzRuntimeErrorCode.ArtifactPublicReadFailed,
      expectedPhase: 'artifact-public-read',
      artifact: (cause: Error, dispose: (artifact: Artifact) => void) => ({
        capture: (value: number) => Object.freeze({ value }),
        readForProgram: (value: Readonly<{ value: number }>) => value.value,
        read: () => {
          throw cause;
        },
        dispose,
      }),
      expectedDisposeCount: 1,
    },
  ];

  it.each(failureCases)('$name failure 使用稳定 code 并释放已捕获资源', testCase => {
    const cause = new Error(`${testCase.name} failed`);
    const ownerDispose = vi.fn();
    const artifactDispose = vi.fn<(artifact: Artifact) => void>();
    const owner = defineOwner(ownerDispose);
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: testCase.artifact(cause, artifactDispose),
      run: view => ({ kind: RuntimeProgramKind.Full, artifact: view.snapshot(owner).value }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });

    expect(() =>
      createRuntimeSession({
        owners,
        programs,
        initialSnapshots: [createRuntimeOwnerInput(owner, Object.freeze({ value: 1 }))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: testCase.expectedCode,
        phase: testCase.expectedPhase,
        program: { owner: 'counter', key: 'program' },
        cause,
      }),
    );
    expect(artifactDispose).toHaveBeenCalledTimes(testCase.expectedDisposeCount);
    expect(ownerDispose).toHaveBeenCalledOnce();
  });

  it('owner capture alias fail-loud 且不释放仍在使用的 current value', () => {
    const shared = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    const owner = defineOwner(ownerDispose);
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, shared)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.OwnerOwnershipAlias }));
    expect(session.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(ownerDispose).not.toHaveBeenCalled();
  });

  it('owner capture alias 在 read 前 fail-loud，read throw 不会释放 current value', () => {
    const shared: Readonly<{ value: number }> = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    let readCount = 0;
    const owner = defineRuntimeOwner<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
      key: 'counter',
      value: {
        capture: input => input,
        read: value => {
          readCount += 1;
          if (readCount > 1) throw new Error('candidate read must not run');
          return value.value;
        },
        equals: (left, right) => left.value === right.value,
        dispose: ownerDispose,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const programs = createRuntimeProgramRegistry({ owners });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, shared)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.OwnerOwnershipAlias }));
    expect(readCount).toBe(1);
    expect(ownerDispose).not.toHaveBeenCalled();
    expect(session.snapshot(owner)).toEqual({ revision: 0, value: 1 });
  });

  it('artifact capture alias fail-loud 且不释放仍在使用的 current artifact', () => {
    const sharedArtifact = Object.freeze({ value: 1 });
    const artifactDispose = vi.fn();
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, typeof sharedArtifact, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: () => sharedArtifact,
        readForProgram: value => value.value,
        read: value => value.value,
        dispose: artifactDispose,
      },
      run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
      update: () => ({ kind: RuntimeProgramKind.Incremental, artifact: 2 }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias }));
    expect(session.artifact(program)).toEqual({ revision: 0, value: 1 });
    expect(artifactDispose).not.toHaveBeenCalled();
  });

  it('artifact capture alias 在双层 read 前 fail-loud，read throw 不会释放 current artifact', () => {
    const sharedArtifact = Object.freeze({ value: 1 });
    const artifactDispose = vi.fn();
    let programReadCount = 0;
    let publicReadCount = 0;
    const owner = defineRuntimeOwner<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const owners = createRuntimeOwnerRegistry({ builtins: [owner] });
    const program = defineRuntimeProgram<number, typeof sharedArtifact, number, number>({
      id: { owner: 'counter', key: 'program' },
      owners: [owner],
      programs: [],
      tracePhases: [],
      artifact: {
        capture: () => sharedArtifact,
        readForProgram: value => {
          programReadCount += 1;
          if (programReadCount > 1) throw new Error('candidate Program read must not run');
          return value.value;
        },
        read: value => {
          publicReadCount += 1;
          if (publicReadCount > 1) throw new Error('candidate public read must not run');
          return value.value;
        },
        dispose: artifactDispose,
      },
      run: () => ({ kind: RuntimeProgramKind.Full, artifact: 1 }),
      update: () => ({ kind: RuntimeProgramKind.Incremental, artifact: 2 }),
    });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(owner, 1)],
    });

    expect(() =>
      session.update({
        baseRevision: session.revision(),
        owners: [createRuntimeOwnerUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias }));
    expect(programReadCount).toBe(1);
    expect(publicReadCount).toBe(1);
    expect(artifactDispose).not.toHaveBeenCalled();
    expect(session.artifact(program)).toEqual({ revision: 0, value: 1 });
  });
});
