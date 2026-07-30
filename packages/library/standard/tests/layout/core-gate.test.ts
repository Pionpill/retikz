import type {
  CompileOptions,
  IRChild,
  IRScene,
  LayoutChildResult,
  LayoutProposal,
  ScenePrimitive,
  TextMeasurer,
} from '@retikz/core';

import {
  BUILTIN_SHAPES,
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  defineShape,
  formatCompileOccurrence,
  isNodeLayoutCompileArtifact,
  LayoutAlignmentGuideDimension,
  LayoutAlignmentGuideName,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

const fixedMeasurer: TextMeasurer = text => ({
  width: [...text].length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const minimumAxis = {
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: LayoutIntrinsicMode.Minimum,
} as const;

const naturalAxis = {
  kind: LayoutAxisProposalKind.Intrinsic,
  mode: LayoutIntrinsicMode.Natural,
} as const;

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

const plainNode = (text: string): IRChild => ({
  type: 'node',
  position: [0, 0],
  text,
  font: { size: 10 },
  lineHeight: 10,
  padding: 0,
  margin: 0,
  fill: 'transparent',
  stroke: 'transparent',
});

/** 递归收集 Scene group，验证 replay 与 Scope 的结构语义未被扁平化 */
const groupsOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<Extract<ScenePrimitive, { type: 'group' }>> =>
  primitives.flatMap(primitive => (primitive.type === 'group' ? [primitive, ...groupsOf(primitive.children)] : []));

/** 递归展开 Scene primitive tree，验证未选 probe 没有发布视觉产物 */
const primitivesOf = (primitives: ReadonlyArray<ScenePrimitive>): Array<ScenePrimitive> =>
  primitives.flatMap(primitive =>
    primitive.type === 'group' ? [primitive, ...primitivesOf(primitive.children)] : [primitive],
  );

/** 在公开 Core 根入口上执行一次真实 child probe 并提交该结果 */
const probeChild = (
  child: IRChild,
  proposal: LayoutProposal,
  options: Pick<CompileOptions, 'lowerTex' | 'shapes'> = {},
): LayoutChildResult => {
  let observed: LayoutChildResult | undefined;
  const definition = defineComposite({
    namespace: 'standard-core-gate',
    type: 'probe',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('standard-core-gate'),
      type: z.literal('probe'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observed = probe.result;
      return { children: [context.replay(probe.result)] };
    },
  });

  compileToScene(
    sceneOf({
      namespace: 'standard-core-gate',
      type: 'probe',
      child,
    }),
    {
      composites: [definition],
      measureText: fixedMeasurer,
      padding: 0,
      ...options,
    },
  );

  if (observed === undefined) throw new Error('Expected Core to resolve the Standard layout probe');
  return observed;
};

describe('Standard Core layout capability gate', () => {
  it('preserves both axes across minimum, natural, range, exact, zero and unbounded proposals', () => {
    const child = plainNode('aa bb cc');
    const proposals = [
      { x: minimumAxis, y: naturalAxis },
      { x: naturalAxis, y: naturalAxis },
      { x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 50 }, y: naturalAxis },
      { x: { kind: LayoutAxisProposalKind.Range, min: 0 }, y: naturalAxis },
      { x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 0 }, y: naturalAxis },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: naturalAxis },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 0 }, y: naturalAxis },
    ] satisfies Array<LayoutProposal>;
    const results = proposals.map(proposal => probeChild(child, proposal));

    expect(results.map(result => result.slotSize)).toEqual([
      { width: 20, height: 30 },
      { width: 80, height: 10 },
      { width: 50, height: 20 },
      { width: 80, height: 10 },
      { width: 0, height: 30 },
      { width: 40, height: 30 },
      { width: 0, height: 30 },
    ]);
    expect(results[5].allocationBounds).toMatchObject({ width: 20, height: 30 });
    expect(results[6].allocationBounds.width).toBeGreaterThan(results[6].slotSize.width);

    const yProposals = [
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: minimumAxis },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: naturalAxis },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        y: { kind: LayoutAxisProposalKind.Range, min: 0, max: 20 },
      },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: { kind: LayoutAxisProposalKind.Range, min: 0 } },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        y: { kind: LayoutAxisProposalKind.Range, min: 0, max: 0 },
      },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: { kind: LayoutAxisProposalKind.Exact, value: 20 } },
      { x: { kind: LayoutAxisProposalKind.Exact, value: 40 }, y: { kind: LayoutAxisProposalKind.Exact, value: 0 } },
    ] satisfies Array<LayoutProposal>;
    const yResults = yProposals.map(proposal => probeChild(child, proposal));

    expect(yResults.map(result => result.slotSize)).toEqual([
      { width: 40, height: 30 },
      { width: 40, height: 30 },
      { width: 40, height: 20 },
      { width: 40, height: 30 },
      { width: 40, height: 0 },
      { width: 40, height: 20 },
      { width: 40, height: 0 },
    ]);
    expect(yResults[6].allocationBounds.height).toBeGreaterThan(yResults[6].slotSize.height);
  });

  it('keeps resolved slot, real allocation and visual bounds independent for fixed geometry', () => {
    const result = probeChild(
      {
        type: 'path',
        stroke: '#000',
        strokeWidth: 4,
        children: [
          { type: 'step', kind: 'move', to: [10, 20] },
          { type: 'step', kind: 'line', to: [50, 30] },
        ],
      },
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 10 },
        y: { kind: LayoutAxisProposalKind.Exact, value: 5 },
      },
    );

    expect(result.slotSize).toEqual({ width: 10, height: 5 });
    expect(result.allocationBounds).toEqual({ x: 10, y: 20, width: 40, height: 10 });
    expect(result.visualBounds).not.toEqual(result.allocationBounds);
    expect(result.visualBounds.x).toBeLessThan(result.allocationBounds.x);
    expect(result.visualBounds.y).toBeLessThan(result.allocationBounds.y);
  });

  it('distinguishes explicit alignment guides from missing guides without child-type inference', () => {
    const explicit = defineComposite({
      namespace: 'standard-core-gate',
      type: 'explicit-guide',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('explicit-guide'),
      }),
      compile: () => ({
        children: [],
        allocationBounds: { x: -5, y: -3, width: 20, height: 10 },
        alignmentGuides: [
          {
            name: LayoutAlignmentGuideName.FirstBaseline,
            dimension: LayoutAlignmentGuideDimension.Y,
            position: 4,
          },
          {
            name: LayoutAlignmentGuideName.LastBaseline,
            dimension: LayoutAlignmentGuideDimension.Y,
            position: 6,
          },
        ],
      }),
    });
    const implicit = defineComposite({
      namespace: 'standard-core-gate',
      type: 'implicit-guide',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('implicit-guide'),
      }),
      compile: () => ({
        children: [],
        allocationBounds: { x: -5, y: -3, width: 20, height: 10 },
      }),
    });
    let explicitResult: LayoutChildResult | undefined;
    let implicitResult: LayoutChildResult | undefined;
    const parent = defineComposite({
      namespace: 'standard-core-gate',
      type: 'guide-parent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('guide-parent'),
      }),
      compile: (_node, context) => {
        const withGuide = context.layoutChild(
          { namespace: 'standard-core-gate', type: 'explicit-guide' },
          NaturalLayoutProposal,
        );
        if (withGuide.kind === LayoutChildProbeKind.Failed) return context.raise(withGuide.failure);
        const withoutGuide = context.layoutChild(
          { namespace: 'standard-core-gate', type: 'implicit-guide' },
          NaturalLayoutProposal,
        );
        if (withoutGuide.kind === LayoutChildProbeKind.Failed) return context.raise(withoutGuide.failure);
        explicitResult = withGuide.result;
        implicitResult = withoutGuide.result;
        return { children: [context.replay(withGuide.result)] };
      },
    });

    compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'guide-parent' }), {
      composites: [explicit, implicit, parent],
    });

    expect(explicitResult?.alignmentGuides).toEqual([
      { name: 'first-baseline', dimension: 'y', position: 4 },
      { name: 'last-baseline', dimension: 'y', position: 6 },
    ]);
    expect(implicitResult?.alignmentGuides).toBeUndefined();
  });

  it('keeps custom providers, TeX, nested Scope and selected artifacts in one probe/replay environment', () => {
    const customShape = defineShape({
      name: 'standard-core-gate-shape',
      paramsSchema: z.strictObject({}),
      circumscribe: () => ({ halfWidth: 10, halfHeight: 5 }),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      *emit(): Iterable<ScenePrimitive> {
        yield { type: 'rect', x: -10, y: -5, width: 20, height: 10, fill: '#2563eb' };
      },
    });
    const lowerTex: NonNullable<CompileOptions['lowerTex']> = () => ({
      paths: [
        {
          commands: [
            { kind: 'move', to: [0, 0] },
            { kind: 'line', to: [30, 0] },
          ],
          fill: { kind: 'currentColor' },
          stroke: { kind: 'none' },
        },
      ],
      width: 30,
      height: 8,
      depth: 2,
    });
    const exactAtomicProposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
      y: naturalAxis,
    };
    const mixed = probeChild(
      {
        ...plainNode(''),
        text: [{ runs: [{ text: 'aa ' }, { tex: 'x' }] }],
      },
      exactAtomicProposal,
      { lowerTex },
    );
    const tex = probeChild(
      {
        ...plainNode(''),
        text: [{ runs: [{ tex: 'x' }] }],
      },
      exactAtomicProposal,
      { lowerTex },
    );
    expect(mixed.slotSize.width).toBe(20);
    expect(mixed.allocationBounds.width).toBe(60);
    expect(tex.slotSize.width).toBe(20);
    expect(tex.allocationBounds.width).toBe(30);

    const nested = defineComposite({
      namespace: 'standard-core-gate',
      type: 'nested',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('nested'),
      }),
      artifactSchema: z.strictObject({ proposal: z.enum(['intrinsic', 'range', 'exact']) }),
      compile: (_node, context) => {
        const child = context.layoutChild(
          {
            type: 'scope',
            transforms: [{ kind: 'translate', x: 7, y: 11 }],
            clip: { kind: 'rect', x: -50, y: -50, width: 100, height: 100 },
            children: [
              {
                type: 'node',
                id: 'selected-node',
                position: [0, 0],
                shape: 'standard-core-gate-shape',
                text: [{ runs: [{ tex: 'x' }] }],
                padding: 0,
                margin: 0,
              },
            ],
          },
          context.proposal,
        );
        if (child.kind === LayoutChildProbeKind.Failed) return context.raise(child.failure);
        return {
          children: [context.replay(child.result)],
          allocationBounds: child.result.allocationBounds,
          artifact: { proposal: context.proposal.x.kind },
        };
      },
    });
    const parent = defineComposite({
      namespace: 'standard-core-gate',
      type: 'nested-parent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('nested-parent'),
      }),
      compile: (_node, context) => {
        const discarded = context.layoutChild(
          { namespace: 'standard-core-gate', type: 'nested' },
          NaturalLayoutProposal,
        );
        if (discarded.kind === LayoutChildProbeKind.Failed) return context.raise(discarded.failure);
        const selected = context.layoutChild(
          { namespace: 'standard-core-gate', type: 'nested' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 40 },
            y: naturalAxis,
          },
        );
        if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
        return {
          children: [
            context.replay(selected.result, {
              transforms: [{ kind: 'translate', x: 13, y: 17 }],
            }),
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'nested-parent' }), {
      composites: [nested, parent],
      shapes: [customShape],
      lowerTex,
      measureText: fixedMeasurer,
      artifacts: { nodeLayouts: true },
      padding: 0,
    });
    const nestedArtifacts = result.artifacts.filter(artifact => artifact.kind === 'composite');

    expect(nestedArtifacts).toHaveLength(1);
    expect(nestedArtifacts[0]?.value).toEqual({ proposal: 'exact' });
    expect(formatCompileOccurrence(nestedArtifacts[0]?.occurrence ?? { sourcePath: '', expansionPath: [] })).toBe(
      'children[0]::replay[0]',
    );
    expect(result.artifacts.filter(isNodeLayoutCompileArtifact)).toHaveLength(1);
    const groups = groupsOf(result.scene.primitives);
    const outer = result.scene.primitives[0];
    expect(outer).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 13, y: 17 }],
    });
    if (outer.type !== 'group') throw new Error('Expected the selected replay placement group');
    const nestedGroups = groupsOf(outer.children);
    expect(nestedGroups).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          transforms: [{ kind: 'translate', x: 7, y: 11 }],
          clipRef: expect.any(String),
        }),
      ]),
    );
    const selectedPrimitives = primitivesOf(result.scene.primitives);
    expect(
      selectedPrimitives.filter(primitive => primitive.type === 'rect' && primitive.fill === '#2563eb'),
    ).toHaveLength(1);
    expect(selectedPrimitives.filter(primitive => primitive.type === 'path')).toHaveLength(1);
    expect(groups).toHaveLength(nestedGroups.length + 1);
  });

  it('isolates discarded failures, preserves raise ownership and rejects duplicate replay', () => {
    const failure = defineComposite({
      namespace: 'standard-core-gate',
      type: 'failure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('failure'),
      }),
      compile: (_node, context) => {
        const staged = context.layoutChild(
          {
            type: 'node',
            id: 'discarded-node',
            position: [0, 0],
            minimumSize: 10,
            fill: {
              kind: 'linearGradient',
              stops: [
                { offset: 0, color: '#ef4444' },
                { offset: 1, color: '#f97316' },
              ],
            },
          },
          NaturalLayoutProposal,
        );
        if (staged.kind === LayoutChildProbeKind.Failed) return context.raise(staged.failure);
        throw new Error('gate child failure');
      },
    });
    const discard = defineComposite({
      namespace: 'standard-core-gate',
      type: 'discard-failure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('discard-failure'),
      }),
      compile: (_node, context) => {
        const failed = context.layoutChild({ namespace: 'standard-core-gate', type: 'failure' }, NaturalLayoutProposal);
        expect(failed.kind).toBe(LayoutChildProbeKind.Failed);
        const selected = context.layoutChild(
          { type: 'coordinate', id: 'selected-coordinate', position: [3, 4] },
          NaturalLayoutProposal,
        );
        if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
        return { children: [context.replay(selected.result)] };
      },
    });
    const raise = defineComposite({
      namespace: 'standard-core-gate',
      type: 'raise-failure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('raise-failure'),
      }),
      compile: (_node, context) => {
        const failed = context.layoutChild({ namespace: 'standard-core-gate', type: 'failure' }, NaturalLayoutProposal);
        if (failed.kind === LayoutChildProbeKind.Failed) return context.raise(failed.failure);
        throw new Error('Expected the failure probe to fail');
      },
    });
    const duplicate = defineComposite({
      namespace: 'standard-core-gate',
      type: 'duplicate-replay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('duplicate-replay'),
      }),
      compile: (_node, context) => {
        const selected = context.layoutChild(
          { type: 'coordinate', id: 'duplicate-coordinate', position: [3, 4] },
          NaturalLayoutProposal,
        );
        if (selected.kind === LayoutChildProbeKind.Failed) return context.raise(selected.failure);
        return { children: [context.replay(selected.result), context.replay(selected.result)] };
      },
    });

    const warnings: Array<string> = [];
    const discarded = compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'discard-failure' }), {
      composites: [failure, discard],
      artifacts: { nodeLayouts: true },
      onWarn: warning => warnings.push(warning.code),
    });
    expect(discarded.scene.primitives).toEqual([]);
    expect(discarded.scene.resources ?? []).toEqual([]);
    expect(discarded.artifacts).toEqual([]);
    expect(warnings).toEqual([]);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'raise-failure' }), {
        composites: [failure, raise],
      }),
    ).toThrow(/standard-core-gate\.failure.*gate child failure/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'duplicate-replay' }), {
        composites: [duplicate],
      }),
    ).toThrow(/already replayed|at most once/i);
  });

  it('rejects replay results outside their callback and compile session and rejects forged results', () => {
    let retained: LayoutChildResult | undefined;
    const producer = defineComposite({
      namespace: 'standard-core-gate',
      type: 'result-producer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('result-producer'),
      }),
      compile: (_node, context) => {
        const result = context.layoutChild(
          { type: 'coordinate', id: 'retained-coordinate', position: [0, 0] },
          NaturalLayoutProposal,
        );
        if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
        retained = result.result;
        return { children: [] };
      },
    });
    const consumer = defineComposite({
      namespace: 'standard-core-gate',
      type: 'result-consumer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('result-consumer'),
      }),
      compile: (_node, context) => ({ children: [context.replay(retained!)] }),
    });
    const forged = defineComposite({
      namespace: 'standard-core-gate',
      type: 'forged-result',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('standard-core-gate'),
        type: z.literal('forged-result'),
      }),
      compile: (_node, context) => ({ children: [context.replay({} as LayoutChildResult)] }),
    });

    expect(() =>
      compileToScene(
        {
          version: 1,
          type: 'scene',
          children: [
            { namespace: 'standard-core-gate', type: 'result-producer' },
            { namespace: 'standard-core-gate', type: 'result-consumer' },
          ],
        },
        { composites: [producer, consumer] },
      ),
    ).toThrow(/does not belong to this composite callback|callback owner/i);

    compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'result-producer' }), {
      composites: [producer],
    });
    expect(() =>
      compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'result-consumer' }), {
        composites: [consumer],
      }),
    ).toThrow(/compile|session|forged|belong/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'standard-core-gate', type: 'forged-result' }), {
        composites: [forged],
      }),
    ).toThrow(/layout|replay|forged|belong/i);
  });

  it('rejects malformed proposals with occurrence-aware diagnostics', () => {
    const invalidProposals = [
      {
        name: 'negative-exact',
        proposal: { x: { kind: LayoutAxisProposalKind.Exact, value: -1 }, y: naturalAxis },
        message: /non-negative/i,
      },
      {
        name: 'nan-exact',
        proposal: { x: { kind: LayoutAxisProposalKind.Exact, value: Number.NaN }, y: naturalAxis },
        message: /finite/i,
      },
      {
        name: 'reversed-range',
        proposal: { x: { kind: LayoutAxisProposalKind.Range, min: 2, max: 1 }, y: naturalAxis },
        message: /min.*max|maximum.*minimum/i,
      },
    ] satisfies Array<{ name: string; proposal: LayoutProposal; message: RegExp }>;

    for (const fixture of invalidProposals) {
      const invalid = defineComposite({
        namespace: 'standard-core-gate',
        type: fixture.name,
        schema: CompositeBaseSchema.extend({
          namespace: z.literal('standard-core-gate'),
          type: z.literal(fixture.name),
        }),
        compile: (_node, context) => {
          context.layoutChild({ type: 'coordinate', id: 'invalid-coordinate', position: [0, 0] }, fixture.proposal);
          return { children: [] };
        },
      });

      expect(() =>
        compileToScene(sceneOf({ namespace: 'standard-core-gate', type: fixture.name }), {
          composites: [invalid],
        }),
      ).toThrow(fixture.message);
      expect(() =>
        compileToScene(sceneOf({ namespace: 'standard-core-gate', type: fixture.name }), {
          composites: [invalid],
        }),
      ).toThrow(new RegExp(`standard-core-gate\\.${fixture.name}.*children\\[0\\].*proposal`, 'i'));
    }
  });
});
