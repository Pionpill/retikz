import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  IRChild,
  IRPaint,
  IRScene,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
} from '../../src';

import {
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineComposite,
  formatCompileOccurrence,
  isNodeLayoutCompileArtifact,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '../../src';

const scene = (children: IRScene['children']): IRScene => ({
  version: 1,
  type: 'scene',
  children,
});

const resolvedResultOf = (
  context: LayoutCompositeCompileContext,
  child: IRChild,
  proposal: LayoutProposal = NaturalLayoutProposal,
): LayoutChildResult => {
  const probe = context.layoutChild(child, proposal);
  if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
  return probe.result;
};

const gradient = (first: string, second: string): IRPaint => ({
  kind: 'linearGradient',
  stops: [
    { offset: 0, color: first },
    { offset: 1, color: second },
  ],
});

describe('layout-aware composite transactions and artifacts', () => {
  it('commits only the exact probe across minimum, natural, and exact transaction side effects', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'multiProposalIsolation',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('multiProposalIsolation'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', id: 'minimum-only', position: [0, 0], text: 'minimum', fill: gradient('#100', '#200') },
          {
            x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Minimum },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        context.layoutChild(
          { type: 'node', id: 'natural-only', position: [0, 0], text: 'natural', fill: gradient('#300', '#400') },
          NaturalLayoutProposal,
        );
        const exact = resolvedResultOf(
          context,
          { type: 'node', id: 'exact-only', position: [0, 0], text: 'exact', fill: gradient('#500', '#600') },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 80 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 30 },
          },
        );
        return { children: [context.replay(exact)] };
      },
    });

    const result = compileToScene(scene([{ namespace: 'test', type: 'multiProposalIsolation' }]), {
      composites: [definition],
      artifacts: { nodeLayouts: true },
    });
    const serialized = JSON.stringify(result);

    expect(serialized).toContain('exact-only');
    expect(serialized).not.toContain('minimum-only');
    expect(serialized).not.toContain('natural-only');
    expect(result.scene.resources).toEqual([{ kind: 'paint', id: 'paint-1', spec: gradient('#500', '#600') }]);
    expect(result.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);
  });
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
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', position: [0, 0], text: 'discarded', fill: discarded },
          NaturalLayoutProposal,
        );
        const final = resolvedResultOf(context, {
          type: 'node',
          position: [0, 0],
          text: 'selected',
          fill: selected,
        });
        return { children: [context.replay(final)] };
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
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: [{ runs: [{ tex: 'x' }] }],
          },
          NaturalLayoutProposal,
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

  it('discards resources, warnings, identities, observations, and artifacts created before a failed child', () => {
    const failure = defineComposite({
      namespace: 'test',
      type: 'lateProbeFailure',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('lateProbeFailure') }),
      compile: () => {
        throw new Error('late failure');
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'failedSideEffectIsolation',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('failedSideEffectIsolation'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'discarded-side-effects',
                position: [0, 0],
                text: [{ runs: [{ tex: 'x' }] }],
                fill: gradient('#123', '#456'),
              },
              { namespace: 'test', type: 'lateProbeFailure' },
            ],
          },
          NaturalLayoutProposal,
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        return { children: [] };
      },
    });
    const warnings: Array<{ code: string }> = [];

    const result = compileToScene(scene([{ namespace: 'test', type: 'failedSideEffectIsolation' }]), {
      composites: [failure, parent],
      artifacts: { nodeLayouts: true },
      onWarn: warning => warnings.push(warning),
    });

    expect(result.scene.primitives).toEqual([]);
    expect(result.scene.resources ?? []).toEqual([]);
    expect(result.artifacts).toEqual([]);
    expect(warnings).toEqual([]);
    expect(JSON.stringify(result)).not.toContain('discarded-side-effects');
  });

  it('commits replayed namespace entries before later siblings resolve them', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'namedChild',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('namedChild'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, {
          type: 'node',
          id: 'inside',
          position: [20, 10],
          minimumSize: 10,
        });
        return { children: [context.replay(laid)] };
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
      compile: (_, context) => {
        context.layoutChild({ type: 'node', id: 'discarded', position: [20, 0] }, NaturalLayoutProposal);
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
      compile: (_, context) => {
        const child = resolvedResultOf(context, {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'ready' } },
          ],
        });
        return { children: [context.replay(child)] };
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
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'child' });
        return {
          children: [context.replay(laid)],
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
      expand: () => ({ children: [{ namespace: 'test', type: 'layoutArtifact' }] }),
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
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'replayedLeaf' }],
          },
          NaturalLayoutProposal,
        );
        const selected = resolvedResultOf(context, {
          type: 'scope',
          children: [{ namespace: 'test', type: 'replayedLeaf' }],
        });
        return { children: [context.replay(selected)] };
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
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { type: 'node', id: 'replayed', position: [0, 0], text: 'N' });
        return { children: [context.replay(laid)] };
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
