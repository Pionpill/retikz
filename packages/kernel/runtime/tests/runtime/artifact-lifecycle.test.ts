import { describe, expect, it, vi } from 'vitest';

import { RetikzRuntimeErrorCode } from '../../src';
import type { RuntimeComputationArtifactDefinitionInput } from '../../src/computation';
import { defineRuntimeComputation, RuntimeComputationKind } from '../../src/computation';
import { createRuntimeSourceRegistry, createRuntimeComputationRegistry } from '../../src/registry';
import { createRuntime } from '../../src/runtime';
import { defineRuntimeSource } from '../../src/source';
import { createRuntimeSourceInput, createRuntimeSourceUpdate } from '../../src/transaction';

const defineSource = (dispose = vi.fn()) =>
  defineRuntimeSource<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
    key: 'counter',
    value: {
      capture: input => input,
      read: input => input.value,
      equals: (left, right) => left.value === right.value,
      dispose,
    },
  });

type Artifact = Readonly<{ value: number }>;

type ArtifactDefinition = RuntimeComputationArtifactDefinitionInput<number, Artifact, number, number>;

describe('runtime Computation artifact lifecycle', () => {
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
        readForComputation: (value: Readonly<{ value: number }>) => value.value,
        read: (value: Readonly<{ value: number }>) => value.value,
        dispose,
      }),
      expectedDisposeCount: 0,
    },
    {
      name: 'private read',
      expectedCode: RetikzRuntimeErrorCode.ArtifactComputationReadFailed,
      expectedPhase: 'artifact-computation-read',
      artifact: (cause: Error, dispose: (artifact: Artifact) => void) => ({
        capture: (value: number) => Object.freeze({ value }),
        readForComputation: () => {
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
        readForComputation: (value: Readonly<{ value: number }>) => value.value,
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
    const owner = defineSource(ownerDispose);
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, Readonly<{ value: number }>, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: testCase.artifact(cause, artifactDispose),
      run: view => ({ kind: RuntimeComputationKind.Full, artifact: view.snapshot(owner).value }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });

    expect(() =>
      createRuntime({
        sources,
        computations,
        initialSnapshots: [createRuntimeSourceInput(owner, Object.freeze({ value: 1 }))],
      }),
    ).toThrowError(
      expect.objectContaining({
        code: testCase.expectedCode,
        phase: testCase.expectedPhase,
        computation: { owner: 'counter', key: 'computation' },
        cause,
      }),
    );
    expect(artifactDispose).toHaveBeenCalledTimes(testCase.expectedDisposeCount);
    expect(ownerDispose).toHaveBeenCalledOnce();
  });

  it('owner capture alias fail-loud 且不释放仍在使用的 current value', () => {
    const shared = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    const owner = defineSource(ownerDispose);
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, shared)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceOwnershipAlias }));
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
    expect(ownerDispose).not.toHaveBeenCalled();
  });

  it('owner capture alias 在 read 前 fail-loud，read throw 不会释放 current value', () => {
    const shared: Readonly<{ value: number }> = Object.freeze({ value: 1 });
    const ownerDispose = vi.fn();
    let readCount = 0;
    const owner = defineRuntimeSource<Readonly<{ value: number }>, Readonly<{ value: number }>, number, never>({
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
    const sources = createRuntimeSourceRegistry([owner]);
    const computations = createRuntimeComputationRegistry({ sources });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, shared)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, shared)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.SourceOwnershipAlias }));
    expect(readCount).toBe(1);
    expect(ownerDispose).not.toHaveBeenCalled();
    expect(runtime.snapshot(owner)).toEqual({ revision: 0, value: 1 });
  });

  it('artifact capture alias fail-loud 且不释放仍在使用的 current artifact', () => {
    const sharedArtifact = Object.freeze({ value: 1 });
    const artifactDispose = vi.fn();
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, typeof sharedArtifact, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: () => sharedArtifact,
        readForComputation: value => value.value,
        read: value => value.value,
        dispose: artifactDispose,
      },
      run: () => ({ kind: RuntimeComputationKind.Full, artifact: 1 }),
      update: () => ({ kind: RuntimeComputationKind.Incremental, artifact: 2 }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias }));
    expect(runtime.artifact(computation)).toEqual({ revision: 0, value: 1 });
    expect(artifactDispose).not.toHaveBeenCalled();
  });

  it('artifact capture alias 在双层 read 前 fail-loud，read throw 不会释放 current artifact', () => {
    const sharedArtifact = Object.freeze({ value: 1 });
    const artifactDispose = vi.fn();
    let computationReadCount = 0;
    let publicReadCount = 0;
    const owner = defineRuntimeSource<number, number, number, never>({
      key: 'counter',
      value: {
        capture: value => value,
        read: value => value,
        equals: (left, right) => left === right,
      },
    });
    const sources = createRuntimeSourceRegistry([owner]);
    const computation = defineRuntimeComputation<number, typeof sharedArtifact, number, number>({
      id: { owner: 'counter', key: 'computation' },
      sources: [owner],
      computations: [],
      tracePhases: [],
      artifact: {
        capture: () => sharedArtifact,
        readForComputation: value => {
          computationReadCount += 1;
          if (computationReadCount > 1) throw new Error('candidate Computation read must not run');
          return value.value;
        },
        read: value => {
          publicReadCount += 1;
          if (publicReadCount > 1) throw new Error('candidate public read must not run');
          return value.value;
        },
        dispose: artifactDispose,
      },
      run: () => ({ kind: RuntimeComputationKind.Full, artifact: 1 }),
      update: () => ({ kind: RuntimeComputationKind.Incremental, artifact: 2 }),
    });
    const computations = createRuntimeComputationRegistry({ sources, builtins: [computation] });
    const runtime = createRuntime({
      sources,
      computations,
      initialSnapshots: [createRuntimeSourceInput(owner, 1)],
    });

    expect(() =>
      runtime.update({
        baseRevision: runtime.revision(),
        sources: [createRuntimeSourceUpdate(owner, 2)],
      }),
    ).toThrowError(expect.objectContaining({ code: RetikzRuntimeErrorCode.ArtifactOwnershipAlias }));
    expect(computationReadCount).toBe(1);
    expect(publicReadCount).toBe(1);
    expect(artifactDispose).not.toHaveBeenCalled();
    expect(runtime.artifact(computation)).toEqual({ revision: 0, value: 1 });
  });
});
