import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  CompositeCompileChild,
  CompositeCompileScopeProps,
  IRAnimationTrack,
  IRChild,
  IRPaintSpec,
  IRScene,
  LayoutChildResult,
  ScenePrimitive,
} from '../../src';

import {
  ChildSchema,
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  formatCompileOccurrence,
  isNodeLayoutCompileArtifact,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const node = (id: string, position: readonly [number, number] = [0, 0]): IRChild => ({
  type: 'node',
  id,
  position: [...position],
  minimumSize: 8,
  padding: 0,
  margin: 0,
});

const groups = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> => {
  const output: Array<Extract<ScenePrimitive, { type: 'group' }>> = [];
  const visit = (primitive: ScenePrimitive): void => {
    if (primitive.type !== 'group') return;
    output.push(primitive);
    primitive.children.forEach(visit);
  };
  primitives.forEach(visit);
  return output;
};

const fade: IRAnimationTrack = {
  property: 'opacity',
  keyframes: [
    { at: 0, value: 0 },
    { at: 1, value: 1 },
  ],
  duration: 200,
};

describe('layout-aware composite runtime wrapper tree', () => {
  it('keeps an outer clip/meta frame separate from the inner numeric placement frame', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'wrappedNode',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('wrappedNode'),
        child: ChildSchema,
      }),
      compile: (value, context) => {
        const laid = context.layoutChild(value.child, { kind: 'intrinsic' });
        const replay = context.replay(laid);
        const placement = context.scope(
          {
            transforms: [
              { kind: 'scale', x: 2, y: 3 },
              { kind: 'translate', x: 10, y: 12 },
            ],
          },
          [replay],
        );
        return {
          children: [
            context.scope(
              {
                id: 'cell',
                clip: { kind: 'rect', x: 0, y: 0, width: 30, height: 20 },
                meta: { role: 'cell' },
              },
              [placement],
            ),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'wrappedNode', child: node('content', [2, 3]) }]), {
      composites: [definition],
      padding: 0,
    });
    const outer = result.scene.primitives[0];

    expect(outer).toMatchObject({ type: 'group', id: 'cell', meta: { role: 'cell' }, clipRef: 'clip-1' });
    expect(outer).not.toHaveProperty('transforms');
    if (outer.type !== 'group') throw new Error('expected outer wrapper group');
    expect(outer.children).toHaveLength(1);
    expect(outer.children[0]).toMatchObject({
      type: 'group',
      transforms: [
        { kind: 'scale', x: 2, y: 3 },
        { kind: 'translate', x: 10, y: 12 },
      ],
    });
    expect(result.scene.resources).toEqual([
      { kind: 'clip', id: 'clip-1', shape: { kind: 'rect', x: 0, y: 0, width: 30, height: 20 } },
    ]);
  });

  it('projects runtime Scope transforms across mixed raw/replayed references, artifacts, and bounds', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'referencedWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('referencedWrapper') }),
      compile: (_value, context) => {
        const laid = context.layoutChild(node('target', [1, 0]), { kind: 'intrinsic' });
        return {
          children: [
            context.scope({ transforms: [{ kind: 'translate', x: 10, y: 0 }] }, [
              context.replay(laid),
              node('raw', [2, 0]),
            ]),
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: { id: 'raw', anchor: 'center' } },
                { type: 'step', kind: 'line', to: { id: 'target', anchor: 'center' } },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'referencedWrapper' }]), {
      composites: [definition],
      artifacts: { nodeLayouts: true },
      padding: 0,
    });
    const targetArtifact = result.artifacts.find(
      artifact => isNodeLayoutCompileArtifact(artifact) && artifact.value.id === 'target',
    );
    const rawArtifact = result.artifacts.find(
      artifact => isNodeLayoutCompileArtifact(artifact) && artifact.value.id === 'raw',
    );
    const wrapper = result.scene.primitives.find(primitive => primitive.type === 'group');
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    const move = path?.type === 'path' ? path.commands.find(command => command.kind === 'move') : undefined;
    const line = path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined;

    expect(wrapper).toMatchObject({ transforms: [{ kind: 'translate', x: 10, y: 0 }] });
    expect(targetArtifact?.value.rect.x).toBe(11);
    expect(rawArtifact?.value.rect.x).toBe(12);
    expect(move).toMatchObject({ to: [12, 0] });
    expect(line).toMatchObject({ to: [11, 0] });
    expect(result.scene.layout).toEqual({ x: 7, y: -4, width: 9, height: 8 });
  });

  it('preserves empty id/meta scopes and sorts a wrapper as one zIndex sibling unit', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'emptyAndSorted',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('emptyAndSorted'),
      }),
      compile: (_value, context) => ({
        children: [
          context.scope({ id: 'empty', meta: { empty: true } }, []),
          node('plain', [20, 0]),
          context.scope({ id: 'late', zIndex: 5 }, [node('inside', [10, 0])]),
        ],
      }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'emptyAndSorted' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives.at(-1)).toMatchObject({ type: 'group', id: 'late' });
    expect(groups(result.scene.primitives)).toContainEqual(
      expect.objectContaining({ type: 'group', id: 'empty', meta: { empty: true }, children: [] }),
    );
  });

  it('keeps already-lowered non-origin rotation centers and the remaining structural Scope fields', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'allFields',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('allFields') }),
      compile: (_value, context) => ({
        children: [
          context.scope(
            {
              id: 'all',
              localNamespace: true,
              transforms: [{ kind: 'rotate', degrees: 30, cx: 4, cy: 5 }],
              clip: { kind: 'circle', cx: 0, cy: 0, r: 20 },
              zIndex: 2,
              boundingShape: 'circle',
              meta: { role: 'all' },
              animations: [fade],
            },
            [node('inside')],
          ),
        ],
      }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'allFields' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives[0]).toMatchObject({
      type: 'group',
      id: 'all',
      transforms: [{ kind: 'rotate', degrees: 30, cx: 4, cy: 5 }],
      meta: { role: 'all' },
      animations: [fade],
    });
  });

  it('rejects the same replay when it is reached through sibling wrapper branches', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateWrappedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('duplicateWrappedReplay'),
      }),
      compile: (_value, context) => {
        const laid = context.layoutChild(node('once'), { kind: 'intrinsic' });
        const replay = context.replay(laid);
        return {
          children: [context.scope({ id: 'a' }, [replay]), context.scope({ id: 'b' }, [replay])],
        };
      },
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'duplicateWrappedReplay' }]), {
        composites: [definition],
      }),
    ).toThrow(/replay.*once|already.*replay/i);
  });

  it('rejects retained handles and layout results across compile sessions', () => {
    let retainedHandle: CompositeCompileChild | undefined;
    let retainedResult: LayoutChildResult | undefined;
    let run = 0;
    const definition = defineComposite({
      namespace: 'test',
      type: 'retained',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('retained') }),
      compile: (_value, context) => {
        run += 1;
        if (run === 1) {
          retainedResult = context.layoutChild(node('retained'), { kind: 'intrinsic' });
          retainedHandle = context.replay(retainedResult);
          return { children: [] };
        }
        return {
          children: [retainedHandle ?? context.replay(retainedResult!)],
        };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'retained' }]), { composites: [definition] });
    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'retained' }]), { composites: [definition] }),
    ).toThrow(/compile|session|forged|belong/i);
  });

  it('rejects output handles from another callback in the same compile', () => {
    let foreignHandle: CompositeCompileChild | undefined;
    let foreignResult: LayoutChildResult | undefined;
    const producer = defineComposite({
      namespace: 'test',
      type: 'producer',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('producer') }),
      compile: (_value, context) => {
        foreignResult = context.layoutChild(node('foreign'), { kind: 'intrinsic' });
        foreignHandle = context.replay(foreignResult);
        return { children: [] };
      },
    });
    const consumer = defineComposite({
      namespace: 'test',
      type: 'consumer',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('consumer') }),
      compile: (_value, context) => ({
        children: [context.scope({}, [foreignHandle ?? context.replay(foreignResult!)])],
      }),
    });

    expect(() =>
      compileToScene(
        scene([
          { namespace: 'test', type: 'producer' },
          { namespace: 'test', type: 'consumer' },
        ]),
        { composites: [producer, consumer] },
      ),
    ).toThrow(/does not belong to this composite callback|callback owner/i);
  });

  it('rejects layout results from another callback in the same compile', () => {
    let foreignResult: LayoutChildResult | undefined;
    const producer = defineComposite({
      namespace: 'test',
      type: 'resultProducer',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('resultProducer') }),
      compile: (_value, context) => {
        foreignResult = context.layoutChild(node('foreign-result'), { kind: 'intrinsic' });
        return { children: [] };
      },
    });
    const consumer = defineComposite({
      namespace: 'test',
      type: 'resultConsumer',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('resultConsumer') }),
      compile: (_value, context) => ({ children: [context.replay(foreignResult!)] }),
    });

    expect(() =>
      compileToScene(
        scene([
          { namespace: 'test', type: 'resultProducer' },
          { namespace: 'test', type: 'resultConsumer' },
        ]),
        { composites: [producer, consumer] },
      ),
    ).toThrow(/does not belong to this composite callback|callback owner/i);
  });

  it('rejects forged output children and forged layout results', () => {
    const forgedChild = defineComposite({
      namespace: 'test',
      type: 'forgedChild',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('forgedChild') }),
      compile: (_value, context) => ({
        children: [context.scope({}, [{} as CompositeCompileChild])],
      }),
    });
    const forgedResult = defineComposite({
      namespace: 'test',
      type: 'forgedResult',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('forgedResult') }),
      compile: (_value, context) => ({
        children: [context.replay({} as LayoutChildResult)],
      }),
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'forgedChild' }]), { composites: [forgedChild] }),
    ).toThrow(/forged|output child|belong/i);
    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'forgedResult' }]), { composites: [forgedResult] }),
    ).toThrow(/layout|replay|forged|belong/i);
  });

  it('imports nested replay paint and clip resources once and remaps primitive references', () => {
    const paint: IRPaintSpec = {
      kind: 'linearGradient',
      stops: [
        { offset: 0, color: '#f00' },
        { offset: 1, color: '#00f' },
      ],
    };
    const definition = defineComposite({
      namespace: 'test',
      type: 'resourceWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('resourceWrapper') }),
      compile: (_value, context) => {
        const laid = context.layoutChild(
          {
            type: 'scope',
            clip: { kind: 'circle', cx: 0, cy: 0, r: 20 },
            children: [{ ...node('resource'), fill: paint }],
          },
          { kind: 'intrinsic' },
        );
        return {
          children: [
            context.scope({ clip: { kind: 'rect', x: -10, y: -10, width: 20, height: 20 } }, [
              context.scope({}, [context.replay(laid)]),
            ]),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'resourceWrapper' }]), {
      composites: [definition],
    });
    const resources = result.scene.resources ?? [];
    const ids = resources.map(resource => resource.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(resources.filter(resource => resource.kind === 'paint')).toHaveLength(1);
    expect(resources.filter(resource => resource.kind === 'clip')).toHaveLength(2);
    expect(groups(result.scene.primitives).filter(group => group.clipRef !== undefined)).toHaveLength(2);
    const serializedPrimitives = JSON.stringify(result.scene.primitives);
    for (const id of ids) expect(serializedPrimitives).toContain(id);
  });

  it('rebases replay artifacts from the probe origin through nested runtime scopes', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'artifactLeaf',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('artifactLeaf') }),
      artifactSchema: z.strictObject({ leaf: z.literal(true) }),
      compile: () => ({ children: [node('artifact-node')], artifact: { leaf: true } }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'artifactParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('artifactParent') }),
      artifactSchema: z.strictObject({ parent: z.literal(true) }),
      compile: (_value, context) => {
        const laid = context.layoutChild(
          { type: 'scope', children: [{ namespace: 'test', type: 'artifactLeaf' }] },
          { kind: 'intrinsic' },
        );
        return {
          children: [context.scope({ id: 'outer' }, [context.scope({}, [context.replay(laid)])])],
          artifact: { parent: true },
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'artifactParent' }]), {
      composites: [leaf, parent],
      artifacts: { nodeLayouts: true },
    });
    const leafArtifact = result.artifacts.find(
      artifact => artifact.kind === 'composite' && artifact.type === 'artifactLeaf',
    );
    const nodeArtifact = result.artifacts.find(isNodeLayoutCompileArtifact);

    expect(leafArtifact?.occurrence.expansionPath).toEqual([
      { kind: 'output', index: 0 },
      { kind: 'scopeChild', index: 0 },
      { kind: 'replay', index: 0 },
      { kind: 'scopeChild', index: 0 },
    ]);
    expect(nodeArtifact?.occurrence.expansionPath).toEqual([
      { kind: 'output', index: 0 },
      { kind: 'scopeChild', index: 0 },
      { kind: 'replay', index: 0 },
      { kind: 'scopeChild', index: 0 },
      { kind: 'output', index: 0 },
    ]);
    expect(formatCompileOccurrence(leafArtifact!.occurrence)).toBe(
      'children[0]::output[0]::scopeChild[0]::replay[0]::scopeChild[0]',
    );
  });

  it('keeps replayed ids inside a runtime local namespace', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'localWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('localWrapper') }),
      compile: (_value, context) => {
        const laid = context.layoutChild(node('secret'), { kind: 'intrinsic' });
        return {
          children: [
            context.scope({ id: 'local', localNamespace: true }, [context.replay(laid)]),
            {
              type: 'path',
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: { id: 'secret' } },
              ],
            },
          ],
        };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'localWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toContainEqual(expect.objectContaining({ code: CompileWarningCode.UnresolvedNodeReference }));
  });

  it('allows replayed ids to shadow outer ids inside a runtime local namespace', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'localShadowWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('localShadowWrapper') }),
      compile: (_value, context) => {
        const laid = context.layoutChild(node('shared', [10, 0]), { kind: 'intrinsic' });
        return {
          children: [context.scope({ id: 'local', localNamespace: true }, [context.replay(laid)])],
        };
      },
    });

    const result = compileToScene(scene([node('shared'), { namespace: 'test', type: 'localShadowWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(groups(result.scene.primitives)).toContainEqual(expect.objectContaining({ id: 'local' }));
    expect(warnings).not.toContainEqual(expect.objectContaining({ code: CompileWarningCode.DuplicateNodeId }));
  });

  it('preserves probe-local duplicate warnings when suppressing an obsolete parent collision', () => {
    const warnings: Array<{ code: string; message: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'orderedDuplicateWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('orderedDuplicateWrapper') }),
      compile: (_value, context) => {
        const laid = context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'scope',
                localNamespace: true,
                children: [node('shared'), node('shared', [2, 0])],
              },
              node('shared', [10, 0]),
            ],
          },
          { kind: 'intrinsic' },
        );
        return {
          children: [context.scope({ localNamespace: true }, [context.replay(laid)])],
        };
      },
    });

    compileToScene(scene([node('shared'), { namespace: 'test', type: 'orderedDuplicateWrapper' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    const duplicates = warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId);
    expect(duplicates).toHaveLength(1);
    expect(duplicates[0].message).toContain('under <Scope localNamespace>');
  });

  it('detaches every mutable wrapper input at builder time', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'detachedWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('detachedWrapper') }),
      compile: (_value, context) => {
        const transforms = [{ kind: 'translate' as const, x: 2, y: 3 }];
        const clip = { kind: 'rect' as const, x: 0, y: 0, width: 20, height: 10 };
        const meta = { role: 'original' };
        const animations = [{ ...fade, keyframes: fade.keyframes.map(frame => ({ ...frame })) }];
        const children: Array<IRChild | CompositeCompileChild> = [node('original')];
        const props = { id: 'detached', transforms, clip, meta, animations };
        const wrapper = context.scope(props, children);

        transforms[0].x = 99;
        clip.width = 99;
        meta.role = 'mutated';
        animations[0].duration = 999;
        children[0] = node('mutated');
        props.id = 'mutated';
        return { children: [wrapper] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'detachedWrapper' }]), {
      composites: [definition],
    });

    expect(result.scene.primitives[0]).toMatchObject({
      type: 'group',
      id: 'detached',
      transforms: [{ kind: 'translate', x: 2, y: 3 }],
      meta: { role: 'original' },
      animations: [expect.objectContaining({ duration: 200 })],
    });
    expect(JSON.stringify(result.scene.primitives)).toContain('original');
    expect(JSON.stringify(result.scene.primitives)).not.toContain('mutated');
  });

  it.each([
    ['unknown key', { unknown: true }],
    ['placement', { placement: { target: [0, 0] } }],
    ['style field', { fill: 'red' }],
    ['empty id', { id: '' }],
    ['invalid localNamespace', { localNamespace: 'yes' }],
    ['fractional zIndex', { zIndex: 1.5 }],
    ['infinite zIndex', { zIndex: Infinity }],
    ['invalid boundingShape', { boundingShape: 'triangle' }],
    ['non-json meta', { meta: { bad: undefined } }],
    ['invalid clip', { clip: { kind: 'rect', x: 0, y: 0, width: 0, height: 10 } }],
    ['invalid animations', { animations: [{}] }],
    ['malformed transform', { transforms: [{ kind: 'translate', x: 0 }] }],
    ['non-finite transform', { transforms: [{ kind: 'scale', x: NaN }] }],
  ])('rejects invalid runtime Scope props: %s', (_name, rawProps) => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidProps',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('invalidProps') }),
      compile: (_value, context) => ({
        children: [context.scope(rawProps as CompositeCompileScopeProps, [])],
      }),
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'invalidProps' }]), { composites: [definition] }),
    ).toThrow(/Composite 'test\.invalidProps'.*(invalid|finite|unknown|JSON|unsupported)/i);
  });

  it('rejects non-array replay transforms with the current composite occurrence', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidReplayTransforms',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidReplayTransforms'),
      }),
      compile: (_value, context) => {
        const laid = context.layoutChild(node('content'), { kind: 'intrinsic' });
        return { children: [context.replay(laid, {} as never)] };
      },
    });

    expect(() =>
      compileToScene(scene([{ namespace: 'test', type: 'invalidReplayTransforms' }]), {
        composites: [definition],
      }),
    ).toThrow(/Composite 'test\.invalidReplayTransforms'.*invalid.*replay transforms/i);
  });

  it('expresses the Table-like root, Cell placement, content replay, and Border replay in one compile', () => {
    const borderLeaf = defineComposite({
      namespace: 'test',
      type: 'borderLeaf',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('borderLeaf') }),
      artifactSchema: z.strictObject({ role: z.literal('border') }),
      compile: () => ({
        children: [
          {
            type: 'path',
            id: 'border',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [40, 0] },
            ],
          },
        ],
        artifact: { role: 'border' },
      }),
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'tableLike',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('tableLike') }),
      compile: (_value, context) => {
        const content = context.layoutChild(node('content'), { kind: 'constrained', maxWidth: 40 });
        const border = context.layoutChild({ namespace: 'test', type: 'borderLeaf' }, { kind: 'intrinsic' });
        const cell = context.scope(
          {
            id: 'cell-0-0',
            clip: { kind: 'rect', x: 0, y: 0, width: 40, height: 20 },
            meta: { row: 0, column: 0 },
          },
          [context.scope({ transforms: [{ kind: 'translate', x: 5, y: 6 }] }, [context.replay(content)])],
        );
        return {
          children: [
            context.scope({ id: 'table-root', localNamespace: true }, [
              node('allocation-sentinel'),
              cell,
              context.replay(border),
            ]),
          ],
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'tableLike' }]), {
      composites: [borderLeaf, definition],
      artifacts: { nodeLayouts: true },
    });
    const root = result.scene.primitives[0];

    expect(root).toMatchObject({ type: 'group', id: 'table-root' });
    if (root.type !== 'group') throw new Error('expected table root group');
    expect(root.children).toHaveLength(3);
    expect(groups(root.children)).toContainEqual(
      expect.objectContaining({ type: 'group', id: 'cell-0-0', meta: { row: 0, column: 0 }, clipRef: 'clip-1' }),
    );
    expect(JSON.stringify(root.children).match(/content/g)).toHaveLength(1);
    expect(JSON.stringify(root.children).match(/border/g)).toHaveLength(1);
    const occurrences = result.artifacts
      .filter(isNodeLayoutCompileArtifact)
      .map(artifact => formatCompileOccurrence(artifact.occurrence));
    expect(new Set(occurrences).size).toBe(occurrences.length);
    expect(occurrences.some(value => value.includes('scopeChild[1]::scopeChild[0]::replay[0]'))).toBe(true);
    const borderArtifact = result.artifacts.find(artifact => artifact.kind === 'composite');
    expect(formatCompileOccurrence(borderArtifact!.occurrence)).toBe('children[0]::output[0]::replay[2]');
  });
});
