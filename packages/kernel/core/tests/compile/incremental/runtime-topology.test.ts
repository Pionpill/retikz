import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeProgramRegistry,
  createRuntimeSession,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type {
  CompileWarning,
  IRChild,
  IRScene,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
  ScenePrimitive,
} from '../../../src';
import type { RuntimePrimitiveMetadataTable } from '../../../src/compile/orchestration';

import {
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  CoreOwnerDefinition,
  defineComposite,
  definePathKind,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
  PathSchema,
} from '../../../src';
import { compileCoreSnapshot } from '../../../src/compile/compile';

const identityKey = (identity: { owner: string; path: ReadonlyArray<string> }): string =>
  `${identity.owner}:${identity.path.join('/')}`;

const flattenPrimitives = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> => {
  const flattened: Array<ScenePrimitive> = [];
  const visit = (primitive: ScenePrimitive): void => {
    flattened.push(primitive);
    if (primitive.type === 'group') primitive.children.forEach(visit);
  };
  primitives.forEach(visit);
  return flattened;
};

const resolvedResultOf = (
  context: LayoutCompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal = NaturalLayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const runtimeRevision = (() => {
  const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
  const programs = createRuntimeProgramRegistry({ owners, builtins: [] });
  return createRuntimeSession({
    owners,
    programs,
    initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, { version: 1, type: 'scene', children: [] })],
  }).revision();
})();

const recordsOf = (ir: IRScene) => {
  const compiled = compileCoreSnapshot(ir, { onWarn: () => {} }, { candidateRevision: runtimeRevision });
  const metadata: RuntimePrimitiveMetadataTable | undefined = compiled.primitiveMetadata;
  if (metadata === undefined) throw new Error('test compile must produce primitive metadata');
  return flattenPrimitives(compiled.result.scene.primitives).map(primitive => {
    const record = metadata.get(primitive);
    if (record === undefined) throw new Error('primitive metadata must be total');
    return record;
  });
};

describe('Core canonical Runtime topology', () => {
  it('把 provider 重复返回的同一 primitive 对象物化为独立 occurrence identity', () => {
    const sharedPrimitive: ScenePrimitive = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    };
    const repeated = definePathKind({
      name: 'repeated',
      schema: PathSchema.extend({ kind: literal('repeated') }),
      compile: () => ({
        primitives: [sharedPrimitive, sharedPrimitive],
        boundsPoints: [
          [0, 0],
          [10, 10],
        ],
      }),
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            id: 'repeated-path',
            kind: 'repeated',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
        ] as IRScene['children'],
      },
      { pathKinds: [repeated] },
      { candidateRevision: runtimeRevision },
    );
    const [first, second] = compiled.result.scene.primitives;
    const metadata = compiled.primitiveMetadata;
    if (metadata === undefined) throw new Error('test compile must produce primitive metadata');
    const firstRecord = metadata.get(first);
    const secondRecord = metadata.get(second);
    if (firstRecord === undefined || secondRecord === undefined) {
      throw new Error('repeated primitive metadata must be total');
    }

    expect(first).not.toBe(second);
    expect(firstRecord.semanticOwner).toEqual(secondRecord.semanticOwner);
    expect(firstRecord.identity).not.toEqual(secondRecord.identity);
  });

  it('从真实 semantic owner 与 emission role/ordinal 派生唯一 primitive identity', () => {
    const records = recordsOf({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
        {
          type: 'scope',
          id: 'scope-a',
          children: [{ type: 'node', id: 'node-b', position: [80, 0], text: 'B' }],
        },
        {
          type: 'path',
          id: 'path-a',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [80, 0] },
          ],
        },
      ],
    });
    const identityKeys = records.map(record => identityKey(record.identity));
    const semanticOwnerPaths = new Set(records.map(record => record.semanticOwner.path.join('/')));

    expect(new Set(identityKeys).size).toBe(identityKeys.length);
    expect(semanticOwnerPaths).toContain('root/node/node-a');
    expect(semanticOwnerPaths).toContain('root/scope/scope-a');
    expect(semanticOwnerPaths).toContain('root/scope/scope-a/node/node-b');
    expect(semanticOwnerPaths).toContain('root/path/path-a');
    records.forEach(record => {
      expect(record.identity.path.slice(0, record.semanticOwner.path.length)).toEqual(record.semanticOwner.path);
      expect(record.identity.path[record.semanticOwner.path.length]).toBe('emission');
    });
  });

  it('unique id 前插与 reorder 后 identity 稳定，anonymous/duplicate 只使用 candidate-local owner', () => {
    const initial: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B' },
      ],
    };
    const next: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'node-c', position: [160, 0], text: 'C' },
        { type: 'node', id: 'node-b', position: [80, 0], text: 'B' },
        { type: 'node', id: 'node-a', position: [0, 0], text: 'A' },
      ],
    };
    const identitiesOf = (records: ReturnType<typeof recordsOf>, ownerId: string): Array<string> =>
      records
        .filter(record => record.semanticOwner.path.at(-1) === ownerId)
        .map(record => identityKey(record.identity))
        .sort();
    const before = recordsOf(initial);
    const after = recordsOf(next);

    expect(identitiesOf(after, 'node-a')).toEqual(identitiesOf(before, 'node-a'));
    expect(identitiesOf(after, 'node-b')).toEqual(identitiesOf(before, 'node-b'));

    const ambiguous = recordsOf({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'duplicate', position: [0, 0], text: 'A' },
        { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        { type: 'node', position: [160, 0], text: 'C' },
      ],
    });
    expect(ambiguous.every(record => record.semanticOwner.path.includes('candidate'))).toBe(true);
    expect(ambiguous.some(record => record.semanticOwner.path.join('/') === 'root/node/duplicate')).toBe(false);
  });

  it('普通 Scope 不切 namespace frame，跨 boundary 同名 child 都使用 candidate-local owner', () => {
    const records = recordsOf({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'duplicate', position: [0, 0] },
        {
          type: 'scope',
          id: 'scope-a',
          children: [{ type: 'node', id: 'duplicate', position: [20, 0] }],
        },
      ],
    });
    const ownerPaths = new Set(records.map(record => record.semanticOwner.path.join('/')));

    expect([...ownerPaths].filter(path => path.includes('candidate'))).toHaveLength(2);
    expect([...ownerPaths].some(path => path.endsWith('/node/duplicate'))).toBe(false);
  });

  it('localNamespace 隔离同名 child，两个 frame 都保留稳定 owner', () => {
    const records = recordsOf({
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'shared', position: [0, 0] },
        {
          type: 'scope',
          id: 'scope-a',
          localNamespace: true,
          children: [{ type: 'node', id: 'shared', position: [20, 0] }],
        },
      ],
    });
    const ownerPaths = new Set(records.map(record => record.semanticOwner.path.join('/')));

    expect(ownerPaths).toContain('root/node/shared');
    expect(ownerPaths).toContain('root/scope/scope-a/node/shared');
    expect([...ownerPaths].some(path => path.includes('candidate'))).toBe(false);
  });

  it('zIndex 重排后仍按最终 Scene occurrence 查询正确 owner', () => {
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [
          {
            type: 'path',
            id: 'front',
            zIndex: 10,
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
          {
            type: 'path',
            id: 'back',
            zIndex: -10,
            children: [
              { type: 'step', kind: 'move', to: [0, 10] },
              { type: 'step', kind: 'line', to: [10, 10] },
            ],
          },
        ],
      },
      { padding: 0 },
      { candidateRevision: runtimeRevision },
    );
    const metadata = compiled.primitiveMetadata;
    const ownerIds = compiled.result.scene.primitives.map(primitive =>
      metadata?.get(primitive)?.semanticOwner.path.at(-1),
    );

    expect(ownerIds).toEqual(['back', 'front']);
  });

  it('layout-aware Composite 只登记选中 replay，并覆盖 transform wrapper 与其 child', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'topologyReplay',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('topologyReplay'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'node', position: [-100, 0] }, NaturalLayoutProposal);
        const selected = resolvedResultOf(context, { type: 'node', position: [0, 0] });
        return {
          children: [context.replay(selected, { transforms: [{ kind: 'translate', x: 20, y: 30 }] })],
        };
      },
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'topologyReplay' }] as IRScene['children'],
      },
      { composites: [replaying] },
      { candidateRevision: runtimeRevision },
    );
    const primitives = flattenPrimitives(compiled.result.scene.primitives);
    const records = primitives.map(primitive => {
      const record = compiled.primitiveMetadata?.get(primitive);
      if (record === undefined) throw new Error('replayed primitive metadata must be total');
      return record;
    });

    expect(primitives.map(primitive => primitive.type)).toEqual(['group', 'rect']);
    expect(new Set(records.map(record => identityKey(record.identity))).size).toBe(records.length);
    expect(new Set(records.map(record => identityKey(record.semanticOwner))).size).toBe(1);
    expect(records.every(record => record.semanticOwner.path.includes('candidate'))).toBe(true);
  });

  it('Composite 生成的 anonymous 与 duplicate child 都留在 candidate-local boundary', () => {
    const generated = defineComposite({
      namespace: 'test',
      type: 'generatedBoundary',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('generatedBoundary'),
      }),
      expand: () => ({
        children: [
          { type: 'node', id: 'duplicate', position: [0, 0] },
          { type: 'node', id: 'duplicate', position: [20, 0] },
          { type: 'node', position: [40, 0] },
        ],
      }),
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'generatedBoundary' }] as IRScene['children'],
      },
      { composites: [generated] },
      { candidateRevision: runtimeRevision },
    );
    const records = flattenPrimitives(compiled.result.scene.primitives).map(primitive => {
      const record = compiled.primitiveMetadata?.get(primitive);
      if (record === undefined) throw new Error('generated primitive metadata must be total');
      return record;
    });

    expect(records.every(record => record.semanticOwner.path.includes('candidate'))).toBe(true);
    expect(records.some(record => record.semanticOwner.path.join('/') === 'root/node/duplicate')).toBe(false);
  });

  it('Composite 生成项与 source child 同 frame 重名时同时降级为 candidate-local owner', () => {
    const generated = defineComposite({
      namespace: 'test',
      type: 'generatedDuplicate',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('generatedDuplicate'),
      }),
      expand: () => ({ children: [{ type: 'node', id: 'duplicate', position: [20, 0] }] }),
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'duplicate', position: [0, 0] },
          { namespace: 'test', type: 'generatedDuplicate' },
        ] as IRScene['children'],
      },
      { composites: [generated] },
      { candidateRevision: runtimeRevision },
    );
    const ownerPaths = new Set(
      flattenPrimitives(compiled.result.scene.primitives).map(primitive => {
        const record = compiled.primitiveMetadata?.get(primitive);
        if (record === undefined) throw new Error('generated duplicate metadata must be total');
        return record.semanticOwner.path.join('/');
      }),
    );

    expect([...ownerPaths]).toHaveLength(2);
    expect([...ownerPaths].every(path => path.includes('candidate'))).toBe(true);
    expect([...ownerPaths].some(path => path.endsWith('/node/duplicate'))).toBe(false);
  });

  it('选中 replay 引入的 id 与 source child 重名时降级 source owner', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'replayedDuplicate',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedDuplicate'),
      }),
      compile: (_, context) => {
        const selected = resolvedResultOf(context, { type: 'node', id: 'duplicate', position: [20, 0] });
        return { children: [context.replay(selected)] };
      },
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [
          { type: 'node', id: 'duplicate', position: [0, 0] },
          { namespace: 'test', type: 'replayedDuplicate' },
        ] as IRScene['children'],
      },
      { composites: [replaying] },
      { candidateRevision: runtimeRevision },
    );
    const ownerPaths = new Set(
      flattenPrimitives(compiled.result.scene.primitives).map(primitive => {
        const record = compiled.primitiveMetadata?.get(primitive);
        if (record === undefined) throw new Error('replayed duplicate metadata must be total');
        return record.semanticOwner.path.join('/');
      }),
    );

    expect([...ownerPaths]).toHaveLength(2);
    expect([...ownerPaths].every(path => path.includes('candidate'))).toBe(true);
    expect([...ownerPaths].some(path => path.endsWith('/node/duplicate'))).toBe(false);
  });

  it('选中 replay 的 Path id 不依赖 NamespaceStack 也能降级同名 source owner', () => {
    const path = (x: number) => ({
      type: 'path' as const,
      id: 'duplicate',
      children: [
        { type: 'step' as const, kind: 'move' as const, to: [x, 0] as [number, number] },
        { type: 'step' as const, kind: 'line' as const, to: [x + 10, 0] as [number, number] },
      ],
    });
    const replaying = defineComposite({
      namespace: 'test',
      type: 'replayedPathDuplicate',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedPathDuplicate'),
      }),
      compile: (_, context) => {
        const selected = resolvedResultOf(context, path(20));
        return { children: [context.replay(selected)] };
      },
    });
    const compiled = compileCoreSnapshot(
      {
        version: 1,
        type: 'scene',
        children: [path(0), { namespace: 'test', type: 'replayedPathDuplicate' }] as IRScene['children'],
      },
      { composites: [replaying] },
      { candidateRevision: runtimeRevision },
    );
    const ownerPaths = new Set(
      flattenPrimitives(compiled.result.scene.primitives).map(primitive => {
        const record = compiled.primitiveMetadata?.get(primitive);
        if (record === undefined) throw new Error('replayed Path duplicate metadata must be total');
        return record.semanticOwner.path.join('/');
      }),
    );

    expect([...ownerPaths]).toHaveLength(2);
    expect([...ownerPaths].every(ownerPath => ownerPath.includes('candidate'))).toBe(true);
    expect([...ownerPaths].some(ownerPath => ownerPath.endsWith('/path/duplicate'))).toBe(false);
  });
});

describe('Core compile warning collection', () => {
  it('把 direct output 后发生的 replay late duplicate 排在 replay placement', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'outputReplayDuplicateOrder',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('outputReplayDuplicateOrder'),
      }),
      compile: (_, context) => {
        const replay = resolvedResultOf(context, { type: 'node', id: 'duplicate', position: [20, 0] });
        return {
          children: [
            {
              type: 'path',
              children: [{ type: 'step', kind: 'move', to: [0, 0] }],
            },
            { type: 'node', id: 'duplicate', position: [10, 0] },
            context.replay(replay),
          ],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'outputReplayDuplicateOrder' }] as IRScene['children'],
      },
      { composites: [replaying], onWarn: warning => warnings.push(warning) },
    );

    expect(warnings.map(warning => warning.code)).toEqual([
      CompileWarningCode.PathTooShort,
      CompileWarningCode.DuplicateNodeId,
    ]);
  });

  it('把较早 replay 后发生的 replay late duplicate 排在后一个 placement', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'replayReplayDuplicateOrder',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayReplayDuplicateOrder'),
      }),
      compile: (_, context) => {
        const first = resolvedResultOf(context, { type: 'node', id: 'duplicate', position: [20, 0] });
        const second = resolvedResultOf(context, { type: 'node', id: 'duplicate', position: [40, 0] });
        return {
          children: [
            {
              type: 'path',
              children: [{ type: 'step', kind: 'move', to: [0, 0] }],
            },
            context.replay(first),
            context.replay(second),
          ],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'replayReplayDuplicateOrder' }] as IRScene['children'],
      },
      { composites: [replaying], onWarn: warning => warnings.push(warning) },
    );

    expect(warnings.map(warning => warning.code)).toEqual([
      CompileWarningCode.PathTooShort,
      CompileWarningCode.DuplicateNodeId,
    ]);
  });

  it('selected replay 内按 scopeChild occurrence 排列延迟 Path 与 duplicate warning', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'replayedScopeWarningOrder',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedScopeWarningOrder'),
      }),
      compile: (_, context) => {
        const replay = resolvedResultOf(context, {
          type: 'scope',
          localNamespace: true,
          children: [
            {
              type: 'path',
              children: [{ type: 'step', kind: 'move', to: [0, 0] }],
            },
            { type: 'node', id: 'duplicate', position: [20, 0] },
            { type: 'node', id: 'duplicate', position: [40, 0] },
          ],
        });
        return { children: [context.replay(replay)] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'replayedScopeWarningOrder' }] as IRScene['children'],
      },
      { composites: [replaying], onWarn: warning => warnings.push(warning) },
    );

    expect(warnings.map(warning => warning.code)).toEqual([
      CompileWarningCode.PathTooShort,
      CompileWarningCode.DuplicateNodeId,
    ]);
  });

  it('把 selected replay warning 重映射到 placement occurrence 后再排序', () => {
    const replaying = defineComposite({
      namespace: 'test',
      type: 'replayedWarningOrder',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('replayedWarningOrder'),
      }),
      compile: (_, context) => {
        const replay = resolvedResultOf(context, {
          type: 'path',
          children: [{ type: 'step', kind: 'move', to: [20, 0] }],
        });
        return {
          children: [
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'missing' } },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
            context.replay(replay),
          ],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'replayedWarningOrder' }] as IRScene['children'],
      },
      { composites: [replaying], onWarn: warning => warnings.push(warning) },
    );

    expect(warnings.map(warning => warning.code)).toEqual([
      CompileWarningCode.UnresolvedNodeReference,
      CompileWarningCode.PathTooShort,
      CompileWarningCode.PathTooShort,
    ]);
  });

  it('按 Composite expansionPath 排列生成 Path 与后续 generated sibling warning', () => {
    const generated = defineComposite({
      namespace: 'test',
      type: 'warningOrder',
      schema: CompositeBaseSchema.extend({
        namespace: literal('test'),
        type: literal('warningOrder'),
      }),
      expand: () => ({
        children: [
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: { id: 'missing' } },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
          { namespace: 'missing', type: 'composite' },
        ],
      }),
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(
      {
        version: 1,
        type: 'scene',
        children: [{ namespace: 'test', type: 'warningOrder' }] as IRScene['children'],
      },
      { composites: [generated], onWarn: warning => warnings.push(warning) },
    );

    expect(warnings.map(warning => warning.code)).toEqual([
      CompileWarningCode.UnresolvedNodeReference,
      CompileWarningCode.PathTooShort,
      CompileWarningCode.CompositeNotRegistered,
    ]);
  });

  it('按 canonical occurrence 顺序派发延迟 Path 与后续 sibling warning', () => {
    const warnings: Array<CompileWarning> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: { id: 'missing' } },
            { type: 'step', kind: 'line', to: [10, 0] },
          ],
        },
        { namespace: 'missing', type: 'composite' },
      ] as IRScene['children'],
    };

    compileToScene(ir, { composites: [], onWarn: warning => warnings.push(warning) });

    expect(warnings.map(warning => warning.path)).toEqual([
      'children[0].path.children[0].to',
      'children[0].path.children[1]',
      'children[1]',
    ]);
  });

  it('完整 compile 失败时不派发已收集 warning', () => {
    const warnings: Array<CompileWarning> = [];
    const ir: IRScene = {
      version: 1,
      type: 'scene',
      children: [
        { type: 'node', id: 'duplicate', position: [0, 0], text: 'A' },
        { type: 'node', id: 'duplicate', position: [80, 0], text: 'B' },
        { type: 'node', id: 'broken', position: [160, 0], text: 'C', shape: 'missing-shape' },
      ],
    };

    expect(() => compileToScene(ir, { onWarn: warning => warnings.push(warning) })).toThrow();
    expect(warnings).toEqual([]);
  });
});
