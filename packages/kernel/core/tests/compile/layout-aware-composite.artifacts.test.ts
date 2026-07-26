import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { IRPaintSpec, IRScene } from '../../src';

import {
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

const gradient = (first: string, second: string): IRPaintSpec => ({
  kind: 'linearGradient',
  stops: [
    { offset: 0, color: first },
    { offset: 1, color: second },
  ],
});

describe('layout-aware composite transactions and artifacts', () => {
  it('publishes only replayed resources and preserves final resource ordering', () => {
    const discarded = gradient('#f00', '#0f0');
    const selected = gradient('#00f', '#fff');
    const definition = defineComposite({
      namespace: 'test',
      type: 'resourceProbe',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('resourceProbe'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'node', position: [0, 0], text: 'discarded', fill: discarded }, { kind: 'intrinsic' });
        const final = layoutChild(
          { type: 'node', position: [0, 0], text: 'selected', fill: selected },
          { kind: 'intrinsic' },
        );
        return { children: [{ kind: 'replay', replay: final.replay }] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'resourceProbe' }]), {
      composites: [definition],
    });

    expect(result.scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: selected }]);
  });

  it('discards probe warnings until the corresponding replay is selected', () => {
    const warnings: Array<{ code: string }> = [];
    const definition = defineComposite({
      namespace: 'test',
      type: 'warningProbe',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('warningProbe'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: [{ runs: [{ tex: 'x' }] }],
          },
          { kind: 'intrinsic' },
        );
        return { children: [] };
      },
    });

    compileToScene(scene([{ namespace: 'test', type: 'warningProbe' }]), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).not.toContainEqual({
      code: CompileWarningCode.TexLowererMissing,
    });
  });

  it('commits replayed namespace entries before later siblings resolve them', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'namedChild',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('namedChild'),
      }),
      compile: (_, { layoutChild }) => {
        const laid = layoutChild(
          { type: 'node', id: 'inside', position: [20, 10], minimumSize: 10 },
          { kind: 'intrinsic' },
        );
        return { children: [{ kind: 'replay', replay: laid.replay }] };
      },
    });
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'namedChild' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'inside' } },
          ],
        },
      ]),
      { composites: [definition] },
    );

    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('keeps a discarded probe namespace invisible to later siblings', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'discardedNamespace',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardedNamespace'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'node', id: 'discarded', position: [20, 0] }, { kind: 'intrinsic' });
        return { children: [] };
      },
    });
    const warnings: Array<{ code: string }> = [];
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'discardedNamespace' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'discarded' } },
          ],
        },
      ]),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings).toContainEqual(expect.objectContaining({ code: CompileWarningCode.UnresolvedNodeReference }));
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(false);
  });

  it('lets layoutChild resolve references completed before the composite occurrence', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'currentReferences',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('currentReferences'),
      }),
      compile: (_, { layoutChild }) => {
        const child = layoutChild(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { id: 'ready' } },
            ],
          },
          { kind: 'intrinsic' },
        );
        return { children: [{ kind: 'replay', replay: child.replay }] };
      },
    });
    const warnings: Array<{ code: string }> = [];
    const result = compileToScene(
      scene([
        { type: 'node', id: 'ready', position: [20, 0] },
        { namespace: 'test', type: 'currentReferences' },
      ]),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings).toEqual([]);
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });

  it('emits parent artifacts before replay descendants and composes occurrence locators', () => {
    const child = defineComposite({
      namespace: 'test',
      type: 'child',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('child'),
      }),
      artifactSchema: z.strictObject({ role: z.literal('child') }),
      compile: () => ({
        children: [{ type: 'node', position: [0, 0], text: 'child' }],
        artifact: { role: 'child' },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'parent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('parent'),
      }),
      artifactSchema: z.strictObject({ role: z.literal('parent') }),
      compile: (_, { layoutChild }) => {
        const laid = layoutChild({ namespace: 'test', type: 'child' }, { kind: 'intrinsic' });
        return {
          children: [{ kind: 'replay', replay: laid.replay }],
          artifact: { role: 'parent' },
        };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'parent' }]), {
      composites: [child, parent],
    });

    expect(result.artifacts).toMatchObject([
      {
        kind: 'composite',
        type: 'parent',
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
      },
      {
        kind: 'composite',
        type: 'child',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [{ kind: 'replay', index: 0 }],
        },
      },
    ]);
  });

  it('tracks expand-generated occurrences and rejects them in lowerIRToKernel separately', () => {
    const layout = defineComposite({
      namespace: 'test',
      type: 'layoutArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('layoutArtifact'),
      }),
      artifactSchema: z.strictObject({ ok: z.literal(true) }),
      compile: () => ({ children: [], artifact: { ok: true } }),
    });
    const expand = defineComposite({
      namespace: 'test',
      type: 'expand',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('expand'),
      }),
      expand: () => ({ namespace: 'test', type: 'layoutArtifact' }),
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'expand' }]), {
      composites: [expand, layout],
    });

    expect(result.artifacts[0]?.occurrence).toEqual({
      sourcePath: 'children[0]',
      expansionPath: [{ kind: 'expand', index: 0 }],
    });
  });

  it('distinguishes generated output Scope descendants from canonical Scope descendants', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'leafArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('leafArtifact'),
      }),
      artifactSchema: z.strictObject({ leaf: z.literal(true) }),
      compile: () => ({ children: [], artifact: { leaf: true } }),
    });
    const wrapper = defineComposite({
      namespace: 'test',
      type: 'scopeOutput',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('scopeOutput'),
      }),
      compile: () => ({
        children: [
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'leafArtifact' }],
          },
        ],
      }),
    });
    const result = compileToScene(
      scene([
        { namespace: 'test', type: 'scopeOutput' },
        {
          type: 'scope',
          children: [{ namespace: 'test', type: 'leafArtifact' }],
        },
      ]),
      { composites: [leaf, wrapper] },
    );

    expect(result.artifacts.map(artifact => artifact.occurrence)).toEqual([
      {
        sourcePath: 'children[0]',
        expansionPath: [
          { kind: 'output', index: 0 },
          { kind: 'scopeChild', index: 0 },
        ],
      },
      {
        sourcePath: 'children[1].scope.children[0]',
        expansionPath: [],
      },
    ]);
  });

  it('composes replay with nested Scope provenance and ignores discarded probes', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'replayedLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('replayedLeaf'),
      }),
      artifactSchema: z.strictObject({ leaf: z.literal(true) }),
      compile: () => ({ children: [], artifact: { leaf: true } }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'replayedScope',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('replayedScope'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'replayedLeaf' }],
          },
          { kind: 'intrinsic' },
        );
        const selected = layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'replayedLeaf' }],
          },
          { kind: 'intrinsic' },
        );
        return { children: [{ kind: 'replay', replay: selected.replay }] };
      },
    });
    const result = compileToScene(scene([{ namespace: 'test', type: 'replayedScope' }]), {
      composites: [leaf, parent],
    });

    expect(result.artifacts).toHaveLength(1);
    expect(result.artifacts[0]?.occurrence).toEqual({
      sourcePath: 'children[0]',
      expansionPath: [
        { kind: 'replay', index: 0 },
        { kind: 'scopeChild', index: 0 },
      ],
    });
    expect(formatCompileOccurrence(result.artifacts[0].occurrence)).toBe('children[0]::replay[0]::scopeChild[0]');
  });

  it('returns immutable detached artifacts and keeps Node layouts opt-in', () => {
    const payload = { width: 10 };
    const definition = defineComposite({
      namespace: 'test',
      type: 'frozen',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('frozen'),
      }),
      artifactSchema: z.strictObject({ width: z.number() }),
      compile: () => ({ children: [], artifact: payload }),
    });
    const ir = scene([
      { namespace: 'test', type: 'frozen' },
      { type: 'node', id: 'node', position: [0, 0], text: 'N' },
    ]);

    const withoutLayouts = compileToScene(ir, { composites: [definition] });
    payload.width = 99;
    expect(withoutLayouts.artifacts).toHaveLength(1);
    expect(withoutLayouts.artifacts[0]?.value).toEqual({ width: 10 });
    expect(Object.isFrozen(withoutLayouts.artifacts)).toBe(true);
    expect(Object.isFrozen(withoutLayouts.artifacts[0]?.value)).toBe(true);

    const withLayouts = compileToScene(ir, {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });
    expect(withLayouts.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);
  });

  it('publishes a replayed Node layout artifact exactly once', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'replayedNodeLayout',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('replayedNodeLayout'),
      }),
      compile: (_node, { layoutChild }) => {
        const laid = layoutChild({ type: 'node', id: 'replayed', position: [0, 0], text: 'N' }, { kind: 'intrinsic' });
        return { children: [{ kind: 'replay', replay: laid.replay }] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'replayedNodeLayout' }]), {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });

    expect(result.artifacts.filter(isNodeLayoutCompileArtifact)).toEqual([
      expect.objectContaining({
        kind: 'nodeLayout',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [{ kind: 'replay', index: 0 }],
        },
      }),
    ]);
  });

  it('orders Node layout and composite artifacts by logical occurrence preorder', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'laterArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('laterArtifact'),
      }),
      artifactSchema: z.strictObject({ value: z.literal('later') }),
      compile: () => ({ children: [], artifact: { value: 'later' } }),
    });

    const result = compileToScene(
      scene([
        { type: 'node', id: 'first', position: [0, 0], text: 'N' },
        { namespace: 'test', type: 'laterArtifact' },
      ]),
      {
        composites: [definition],
        artifacts: { nodeLayouts: true },
      },
    );

    expect(result.artifacts.map(artifact => artifact.kind)).toEqual(['nodeLayout', 'composite']);
  });
});
