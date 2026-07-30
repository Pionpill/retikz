import type { IRScene, ScenePatch, SceneRuntimeSnapshot } from '@retikz/core';

import { CoreOwnerDefinition, createCoreProgram } from '@retikz/core';
import {
  createRuntimeIdentity,
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';

import { RetainedRenderErrorCode } from '../../src/runtime';
import { runtimeStructuralEquals } from '../../src/runtime/shared';
import { validateScenePatch, validateSceneRuntimeSnapshot } from '../../src/runtime/validator';

const source = (fill: string): IRScene => ({
  version: 1,
  type: 'scene',
  children: [
    { type: 'node', id: 'a', position: [0, 0], text: 'A', fill },
    { type: 'node', id: 'b', position: [80, 0], text: 'B', fill: '#3b82f6' },
  ],
});

const createIncrementalPair = () => {
  const program = createCoreProgram({ onWarn: () => undefined });
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
  const session = createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, source('#ef4444'))],
  });
  const current = session.artifact(program).value.snapshot;
  session.update({
    baseRevision: session.revision(),
    owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, source('#22c55e'))],
  });
  const artifact = session.artifact(program).value;
  if (artifact.patch === undefined) throw new Error('expected incremental patch');
  return { current, next: artifact.snapshot, patch: artifact.patch };
};

const createRectSnapshot = (revision: number, identifiers: ReadonlyArray<string>): SceneRuntimeSnapshot => {
  const root = createRuntimeIdentity('validator', ['root']);
  return {
    revision: revision as SceneRuntimeSnapshot['revision'],
    root,
    scene: {
      layout: { x: 0, y: 0, width: 100, height: 100 },
      resources: [],
      animations: [],
      primitives: identifiers.map(identifier => ({
        type: 'rect',
        x: (identifier.charCodeAt(0) - 'a'.charCodeAt(0)) * 10,
        y: 0,
        width: 8,
        height: 8,
        fill: identifier,
      })),
    },
    topology: identifiers.map((identifier, index) => {
      const identity = createRuntimeIdentity('validator', ['entity', identifier]);
      return {
        identity,
        semanticOwner: identity,
        parent: root,
        order: index,
        primitivePath: [index],
        publicId: identifier,
      };
    }),
  };
};

describe('Scene Patch validator', () => {
  it('接受 Core canonical incremental Patch 与 config-only empty Patch', () => {
    const { current, next, patch } = createIncrementalPair();
    expect(() => validateSceneRuntimeSnapshot(current)).not.toThrow();
    expect(() => validateScenePatch(current, patch, next)).not.toThrow();

    const configOnly: SceneRuntimeSnapshot = Object.freeze({
      revision: (current.revision + 1) as SceneRuntimeSnapshot['revision'],
      scene: current.scene,
      root: current.root,
      topology: current.topology,
    });
    expect(() =>
      validateScenePatch(
        current,
        Object.freeze({
          baseRevision: current.revision,
          nextRevision: configOnly.revision,
          operations: Object.freeze([]),
        }),
        configOnly,
      ),
    ).not.toThrow();
  });

  it('拒绝 topology duplicate identity 与 primitive 双射缺口', () => {
    const { current } = createIncrementalPair();
    const invalid = {
      ...current,
      topology: [current.topology[0], { ...current.topology[1], identity: current.topology[0].identity }],
    } as SceneRuntimeSnapshot;

    expect(() => validateSceneRuntimeSnapshot(invalid)).toThrowError(
      expect.objectContaining({ code: RetainedRenderErrorCode.SceneTopologyInvalid }),
    );
  });

  it('拒绝 revision gap、未知 operation 与非独占 replace', () => {
    const { current, next, patch } = createIncrementalPair();
    expect(() =>
      validateScenePatch(current, { ...patch, nextRevision: (next.revision + 1) as typeof next.revision }, next),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchRevisionMismatch }));

    expect(() =>
      validateScenePatch(current, { ...patch, operations: [{ kind: 'unknown' }] } as unknown as ScenePatch, next),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchInvalid }));

    expect(() =>
      validateScenePatch(
        current,
        {
          ...patch,
          operations: [
            { kind: 'replaceScene', snapshot: next },
            { kind: 'setLayout', layout: next.scene.layout },
          ],
        },
        next,
      ),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchInvalid }));
  });

  it('拒绝 operation 固定顺序错误与 Patch/next coherence 漏项', () => {
    const { current, next, patch } = createIncrementalPair();
    expect(() =>
      validateScenePatch(
        current,
        {
          baseRevision: current.revision,
          nextRevision: next.revision,
          operations: [
            { kind: 'setLayout', layout: next.scene.layout },
            { kind: 'setResources', resources: next.scene.resources },
          ],
        },
        next,
      ),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchInvalid }));

    const mismatchingNext: SceneRuntimeSnapshot = {
      ...next,
      scene: {
        ...next.scene,
        layout: { ...next.scene.layout, width: next.scene.layout.width + 10 },
      },
    };
    expect(() => validateScenePatch(current, patch, mismatchingNext)).toThrowError(
      expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchSnapshotMismatch }),
    );
  });

  it('重放 canonical insert/move/remove，并保持 before 与 next sibling 一致', () => {
    const initial = createRectSnapshot(0, ['a']);
    const inserted = createRectSnapshot(1, ['a', 'b']);
    const insertedIdentity = inserted.topology[1].identity;
    const insertPatch: ScenePatch = {
      baseRevision: initial.revision,
      nextRevision: inserted.revision,
      operations: [
        {
          kind: 'insert',
          parent: inserted.root,
          subtree: {
            root: insertedIdentity,
            primitive: inserted.scene.primitives[1],
            topology: [
              {
                identity: insertedIdentity,
                semanticOwner: insertedIdentity,
                order: 0,
                primitivePath: [],
                publicId: 'b',
              },
            ],
          },
        },
      ],
    };
    expect(() => validateScenePatch(initial, insertPatch, inserted)).not.toThrow();

    const moved = createRectSnapshot(2, ['b', 'a']);
    const movePatch: ScenePatch = {
      baseRevision: inserted.revision,
      nextRevision: moved.revision,
      operations: [
        {
          kind: 'move',
          identity: insertedIdentity,
          parent: moved.root,
          before: moved.topology[1].identity,
        },
      ],
    };
    expect(() => validateScenePatch(inserted, movePatch, moved)).not.toThrow();

    const removed = createRectSnapshot(3, ['b']);
    const removePatch: ScenePatch = {
      baseRevision: moved.revision,
      nextRevision: removed.revision,
      operations: [{ kind: 'remove', identity: moved.topology[1].identity }],
    };
    expect(() => validateScenePatch(moved, removePatch, removed)).not.toThrow();
  });

  it('malformed、sparse 与空 path 动态输入只抛具名 Render error', () => {
    const valid = createRectSnapshot(0, ['a']);
    const invalidRoot = {
      ...createRectSnapshot(0, []),
      root: { owner: 'validator', path: [] },
    } as unknown as SceneRuntimeSnapshot;
    const sparseTopology = Array<SceneRuntimeSnapshot['topology'][number]>(1);
    const invalidTopology = { ...valid, topology: sparseTopology } as SceneRuntimeSnapshot;
    const nullTopology = { ...valid, topology: [null] } as unknown as SceneRuntimeSnapshot;
    const malformedGroup = {
      ...valid,
      scene: { ...valid.scene, primitives: [{ type: 'group', children: undefined }] },
    } as unknown as SceneRuntimeSnapshot;
    const sparsePrimitives = Array<SceneRuntimeSnapshot['scene']['primitives'][number]>(1);
    const sparsePrimitiveSnapshot = {
      ...valid,
      scene: { ...valid.scene, primitives: sparsePrimitives },
    } as SceneRuntimeSnapshot;
    const sparseChildren = Array<SceneRuntimeSnapshot['scene']['primitives'][number]>(1);
    const sparseGroupSnapshot = {
      ...valid,
      scene: { ...valid.scene, primitives: [{ type: 'group', children: sparseChildren }] },
    } as unknown as SceneRuntimeSnapshot;

    for (const snapshot of [
      invalidRoot,
      invalidTopology,
      nullTopology,
      malformedGroup,
      sparsePrimitiveSnapshot,
      sparseGroupSnapshot,
    ]) {
      expect(() => validateSceneRuntimeSnapshot(snapshot)).toThrowError(
        expect.objectContaining({ code: RetainedRenderErrorCode.SceneTopologyInvalid }),
      );
    }
    expect(() => validateScenePatch(valid, null as unknown as ScenePatch, valid)).toThrowError(
      expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchInvalid }),
    );

    const next = { ...valid, revision: 1 as SceneRuntimeSnapshot['revision'] };
    const sparseResources = Array<SceneRuntimeSnapshot['scene']['resources'][number]>(1);
    expect(() =>
      validateScenePatch(
        valid,
        {
          baseRevision: valid.revision,
          nextRevision: next.revision,
          operations: [{ kind: 'setResources', resources: sparseResources }],
        },
        next,
      ),
    ).toThrowError(expect.objectContaining({ code: RetainedRenderErrorCode.ScenePatchInvalid }));
    expect(runtimeStructuralEquals(Array(1), [undefined])).toBe(false);
  });

  it('identity 的 toJSON 与额外 own property 不参与 Runtime identity 语义', () => {
    const snapshot = createRectSnapshot(0, ['a', 'b']);
    const decorate = (identity: SceneRuntimeSnapshot['root']) => ({
      owner: identity.owner,
      path: [...identity.path],
      extra: 'ignored',
      toJSON: () => ({ collision: true }),
    });
    const decorated = {
      ...snapshot,
      topology: snapshot.topology.map(node => {
        const identity = decorate(node.identity);
        return { ...node, identity, semanticOwner: identity };
      }),
    } as SceneRuntimeSnapshot;

    expect(() => validateSceneRuntimeSnapshot(decorated)).not.toThrow();
  });

  it('以单次 identity index 重放多个独立 update operation', () => {
    const current = createRectSnapshot(0, ['a', 'b', 'c']);
    const baseNext = createRectSnapshot(1, ['a', 'b', 'c']);
    const next = {
      ...baseNext,
      scene: {
        ...baseNext.scene,
        primitives: baseNext.scene.primitives.map((primitive, index) => ({
          ...primitive,
          fill: `next-${index}`,
        })),
      },
    } as SceneRuntimeSnapshot;
    const patch: ScenePatch = {
      baseRevision: current.revision,
      nextRevision: next.revision,
      operations: next.topology.map((node, index) => ({
        kind: 'update' as const,
        identity: node.identity,
        subtree: {
          root: node.identity,
          primitive: next.scene.primitives[index],
          topology: [
            {
              identity: node.identity,
              semanticOwner: node.semanticOwner,
              order: 0,
              primitivePath: [],
              ...(node.publicId === undefined ? {} : { publicId: node.publicId }),
            },
          ],
        },
      })),
    };

    expect(() => validateScenePatch(current, patch, next)).not.toThrow();
  });
});
