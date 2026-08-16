import {
  createRuntimeOwnerInput,
  createRuntimeOwnerRegistry,
  createRuntimeOwnerUpdate,
  createRuntimeProgramRegistry,
  createRuntimeSession,
  RuntimeProgramKind,
} from '@retikz/runtime';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type {
  CompileWarning,
  IRChild,
  IRScene,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
  TextMeasurer,
} from '../../src';

import {
  ChildSchema,
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  CoreOwnerDefinition,
  createCoreProgram,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  NaturalLayoutProposal,
} from '../../src';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
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

const boxNode = (text = ''): IRChild => ({
  type: 'node',
  position: [0, 0],
  text,
  padding: 0,
  margin: 0,
  minimumSize: 10,
  fill: 'transparent',
  stroke: 'transparent',
  strokeWidth: 0,
});

describe('Box Layout Composite contract', () => {
  it('separates constrained allocation, bounded/exact slot size, and visual bounds', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'slotProbe',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('slotProbe'),
        child: ChildSchema,
      }),
      artifactSchema: z.strictObject({
        allocationWidth: z.number(),
        allocationHeight: z.number(),
        slotWidth: z.number(),
        slotHeight: z.number(),
        visualWidth: z.number(),
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(context, node.child, {
          x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 50 },
          y: { kind: LayoutAxisProposalKind.Exact, value: 40 },
        });
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
            visualWidth: laid.visualBounds.width,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'slotProbe', child: boxNode() }), {
      composites: [definition],
      measureText: fixedMeasurer,
      padding: 0,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');

    expect(artifact?.value).toEqual({
      allocationWidth: 10,
      allocationHeight: 19.2,
      slotWidth: 30,
      slotHeight: 40,
      visualWidth: 10,
    });
  });

  it('uses intrinsic allocation dimensions as the intrinsic slot size', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'intrinsicSlot',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('intrinsicSlot'),
      }),
      artifactSchema: z.strictObject({
        allocationWidth: z.number(),
        allocationHeight: z.number(),
        slotWidth: z.number(),
        slotHeight: z.number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'intrinsicSlot' }), {
      composites: [definition],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      allocationWidth: 10,
      allocationHeight: 19.2,
      slotWidth: 10,
      slotHeight: 19.2,
    });
  });

  it('keeps zero distinct from an indefinite axis', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'zeroProbe',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('zeroProbe'),
      }),
      artifactSchema: z.strictObject({
        exactWidth: z.number(),
        boundedHeight: z.number(),
        indefiniteHeight: z.number(),
      }),
      compile: (_node, context) => {
        const exact = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Exact, value: 0 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        const bounded = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          y: { kind: LayoutAxisProposalKind.Range, min: 0, max: 0 },
        });
        return {
          children: [context.replay(exact)],
          artifact: {
            exactWidth: exact.slotSize.width,
            boundedHeight: bounded.slotSize.height,
            indefiniteHeight: exact.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'zeroProbe' }), {
      composites: [definition],
      measureText: fixedMeasurer,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');

    expect(artifact?.value).toEqual({ exactWidth: 0, boundedHeight: 0, indefiniteHeight: 19.2 });
  });

  it('keeps an overflowing nested child inside explicit allocation and passes exact height without scaling', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedBox',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedBox'),
      }),
      artifactSchema: z.strictObject({
        widthKind: z.string(),
        heightKind: z.string(),
        heightSize: z.number(),
      }),
      compile: (_node, context) => ({
        allocationBounds: { x: 5, y: 6, width: 20, height: 10 },
        children: [{ type: 'coordinate', id: 'nested-point', position: [100, 100] }],
        artifact: {
          widthKind: context.proposal.x.kind,
          heightKind: context.proposal.y.kind,
          heightSize: context.proposal.y.kind === LayoutAxisProposalKind.Exact ? context.proposal.y.value : -1,
        },
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'nestedParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedParent'),
      }),
      artifactSchema: z.strictObject({
        allocationX: z.number(),
        allocationY: z.number(),
        allocationWidth: z.number(),
        allocationHeight: z.number(),
        slotWidth: z.number(),
        slotHeight: z.number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          { namespace: 'test', type: 'nestedBox' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 80 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 40 },
          },
        );
        return {
          children: [context.replay(laid)],
          artifact: {
            allocationX: laid.allocationBounds.x,
            allocationY: laid.allocationBounds.y,
            allocationWidth: laid.allocationBounds.width,
            allocationHeight: laid.allocationBounds.height,
            slotWidth: laid.slotSize.width,
            slotHeight: laid.slotSize.height,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'nestedParent' }), {
      composites: [nested, parent],
      padding: 0,
    });
    const artifacts = result.artifacts.filter(value => value.kind === 'composite');

    expect(artifacts).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ value: { widthKind: 'exact', heightKind: 'exact', heightSize: 40 } }),
        expect.objectContaining({
          value: {
            allocationX: 5,
            allocationY: 6,
            allocationWidth: 20,
            allocationHeight: 10,
            slotWidth: 80,
            slotHeight: 40,
          },
        }),
      ]),
    );
  });

  it('measures an empty composite from its explicit container allocation', () => {
    const empty = defineComposite({
      namespace: 'test',
      type: 'emptyBox',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('emptyBox'),
      }),
      compile: () => ({
        allocationBounds: { x: 2, y: 3, width: 40, height: 20 },
        children: [],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'emptyBoxParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('emptyBoxParent'),
      }),
      artifactSchema: z.strictObject({
        x: z.number(),
        y: z.number(),
        width: z.number(),
        height: z.number(),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'emptyBox' });
        return {
          children: [context.replay(laid)],
          artifact: { ...laid.allocationBounds },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'emptyBoxParent' }), {
      composites: [empty, parent],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      x: 2,
      y: 3,
      width: 40,
      height: 20,
    });
    expect(result.scene.primitives).toEqual([]);
  });

  it('keeps visible child overflow outside an explicit allocation box', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'visibleOverflowLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('visibleOverflowLeaf'),
      }),
      compile: () => ({
        allocationBounds: { x: 0, y: 0, width: 10, height: 10 },
        children: [{ type: 'node', position: [100, 100], minimumSize: 10, padding: 0, margin: 0 }],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'visibleOverflowParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('visibleOverflowParent'),
      }),
      artifactSchema: z.strictObject({ x: z.number(), y: z.number(), width: z.number(), height: z.number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'visibleOverflowLeaf' });
        return { children: [context.replay(laid)], artifact: { ...laid.allocationBounds } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'visibleOverflowParent' }), {
      composites: [leaf, parent],
      padding: 0,
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({
      x: 0,
      y: 0,
      width: 10,
      height: 10,
    });
    expect(result.scene.layout).toEqual({ x: 95, y: 95, width: 10, height: 10 });
  });

  it('reports reflowed height separately from an exact-width slot', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'exactWidthReflow',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('exactWidthReflow'),
      }),
      artifactSchema: z.strictObject({
        intrinsicHeight: z.number(),
        constrainedHeight: z.number(),
        slotWidth: z.number(),
      }),
      compile: (_node, context) => {
        const child = boxNode('aa aa');
        const intrinsic = resolvedResultOf(context, child);
        const constrained = resolvedResultOf(context, child, {
          x: { kind: LayoutAxisProposalKind.Exact, value: 25 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        return {
          children: [context.replay(constrained)],
          artifact: {
            intrinsicHeight: intrinsic.allocationBounds.height,
            constrainedHeight: constrained.allocationBounds.height,
            slotWidth: constrained.slotSize.width,
          },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'exactWidthReflow' }), {
      composites: [definition],
      measureText: fixedMeasurer,
      padding: 0,
    });
    const artifact = result.artifacts.find(value => value.kind === 'composite');
    if (artifact?.kind !== 'composite') throw new Error('Expected exact width artifact');

    const value = artifact.value;
    expect(value.slotWidth).toBe(25);
    expect(value.constrainedHeight).toBeGreaterThan(value.intrinsicHeight);
  });

  it('detaches and freezes nested constraints before a provider can corrupt the parent slot', () => {
    let mutationSucceeded = true;
    let receivedFrozenConstraint = false;
    const nested = defineComposite({
      namespace: 'test',
      type: 'constraintMutator',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('constraintMutator'),
      }),
      compile: (_node, context) => {
        const xProposal = context.proposal.x;
        receivedFrozenConstraint = Object.isFrozen(context.proposal) && Object.isFrozen(xProposal);
        mutationSucceeded = Reflect.set(xProposal, 'value', -5);
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'constraintOwner',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('constraintOwner'),
      }),
      artifactSchema: z.strictObject({ slotWidth: z.number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          { namespace: 'test', type: 'constraintMutator' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [context.replay(laid)], artifact: { slotWidth: laid.slotSize.width } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'constraintOwner' }), {
      composites: [nested, parent],
    });

    expect(receivedFrozenConstraint).toBe(true);
    expect(mutationSucceeded).toBe(false);
    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({ slotWidth: 20 });
  });

  it('normalizes negative zero in slot sizes', () => {
    let slotWidth = Number.NaN;
    const definition = defineComposite({
      namespace: 'test',
      type: 'negativeZeroSlot',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('negativeZeroSlot'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode(), {
          x: { kind: LayoutAxisProposalKind.Exact, value: -0 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        });
        slotWidth = laid.slotSize.width;
        return { children: [context.replay(laid)] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'negativeZeroSlot' }), { composites: [definition] });

    expect(slotWidth).toBe(0);
    expect(Object.is(slotWidth, -0)).toBe(false);
  });

  it('wraps replay roots with canonical transform and clip semantics', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'clippedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('clippedReplay'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return {
          children: [
            context.replay(laid, {
              transforms: [{ kind: 'translate', x: 10, y: 20 }],
              clip: { kind: 'rect', x: 8, y: 18, width: 4, height: 4 },
            }),
          ],
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'clippedReplayParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('clippedReplayParent'),
      }),
      artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'clippedReplay' });
        return {
          children: [context.replay(laid)],
          artifact: { width: laid.allocationBounds.width, height: laid.allocationBounds.height },
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'clippedReplayParent' }), {
      composites: [definition, parent],
      padding: 0,
    });
    const primitive = result.scene.primitives[0];

    expect(result.scene.resources).toEqual([
      expect.objectContaining({
        kind: 'clip',
        id: 'clip-1',
        path: {
          commands: [
            { kind: 'move', to: [8, 18] },
            { kind: 'line', to: [12, 18] },
            { kind: 'line', to: [12, 22] },
            { kind: 'line', to: [8, 22] },
            { kind: 'close' },
          ],
          fillRule: 'nonzero',
        },
      }),
    ]);
    expect(primitive).toMatchObject({
      type: 'group',
      clipRef: 'clip-1',
    });
    expect(primitive).not.toHaveProperty('transforms');
    if (primitive.type !== 'group') throw new Error('expected replay clip group');
    expect(primitive.children[0]).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 10, y: 20 }],
    });
    const allocation = result.artifacts.find(value => value.kind === 'composite')?.value;
    expect(allocation?.width).toBe(10);
    expect(allocation?.height).toBeCloseTo(19.2);
    expect(result.scene.layout).toEqual({ x: 8, y: 18, width: 4, height: 4 });
  });

  it('does not inject origin bounds for empty or fully clipped replay wrappers', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invisibleReplayWrappers',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invisibleReplayWrappers'),
      }),
      compile: (_node, context) => {
        const empty = resolvedResultOf(context, { type: 'coordinate', id: 'empty-coordinate', position: [20, 20] });
        const clipped = resolvedResultOf(context, boxNode());
        return {
          children: [
            context.replay(empty, { clip: { kind: 'rect', x: -10, y: -10, width: 5, height: 5 } }),
            context.replay(clipped, { clip: { kind: 'rect', x: 20, y: 20, width: 5, height: 5 } }),
            { ...boxNode(), position: [100, 100] },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'invisibleReplayWrappers' }), {
      composites: [definition],
      padding: 0,
    });

    expect(result.scene.layout).toEqual({ x: 95, y: 90.4, width: 10, height: 19.2 });
  });

  it('detaches replay wrapper transforms and clip before the callback returns', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'detachedReplayWrapper',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('detachedReplayWrapper'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        const transforms = [{ kind: 'translate' as const, x: 5, y: 6 }];
        const clip = { kind: 'rect' as const, x: -2, y: -2, width: 4, height: 4 };
        const replay = context.replay(laid, { transforms, clip });
        transforms[0].x = 99;
        clip.width = 99;
        return { children: [replay] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'detachedReplayWrapper' }), {
      composites: [definition],
      padding: 0,
    });

    const primitive = result.scene.primitives[0];
    expect(primitive).toMatchObject({ type: 'group', clipRef: 'clip-1' });
    if (primitive.type !== 'group') throw new Error('expected replay clip group');
    expect(primitive.children[0]).toMatchObject({
      type: 'group',
      transforms: [{ kind: 'translate', x: 5, y: 6 }],
    });
    expect(result.scene.resources?.[0]).toMatchObject({
      kind: 'clip',
      path: {
        commands: [
          { kind: 'move', to: [-2, -2] },
          { kind: 'line', to: [2, -2] },
          { kind: 'line', to: [2, 2] },
          { kind: 'line', to: [-2, 2] },
          { kind: 'close' },
        ],
        fillRule: 'nonzero',
      },
    });
  });

  it.each([
    ['unknown field', { unknown: true }],
    ['non-finite transform', { transforms: [{ kind: 'translate', x: Number.NaN, y: 0 }] }],
    ['invalid clip', { clip: { kind: 'rect', x: 0, y: 0, width: 0, height: 10 } }],
  ])('rejects an invalid replay wrapper with occurrence context: %s', (_name, wrapper) => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidReplayWrapper',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidReplayWrapper'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        return { children: [context.replay(laid, wrapper as never)] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidReplayWrapper' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.invalidReplayWrapper.*children\[0\].*(wrapper|transform|clip|unsupported|finite)/i);
  });

  it('keeps a replay token unused when wrapper builder validation is caught', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'replayAfterInvalidWrapper',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('replayAfterInvalidWrapper'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, boxNode());
        expect(() => context.replay(laid, { unknown: true } as never)).toThrow(/unsupported.*wrapper/i);
        return { children: [context.replay(laid)] };
      },
    });

    expect(
      compileToScene(sceneOf({ namespace: 'test', type: 'replayAfterInvalidWrapper' }), {
        composites: [definition],
      }).scene.primitives,
    ).not.toHaveLength(0);
  });

  it.each([
    null,
    { x: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'range', min: 20, max: 10 }, y: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'exact', value: Number.NaN }, y: { kind: 'intrinsic', mode: 'natural' } },
    { x: { kind: 'intrinsic', mode: 'natural' }, y: { kind: 'range', min: 0, max: Number.POSITIVE_INFINITY } },
  ])('rejects invalid dual-axis proposal %o with the composite occurrence', proposal => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidBoxConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidBoxConstraint'),
      }),
      compile: (_node, context) => {
        context.layoutChild(boxNode(), proposal as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidBoxConstraint' }), { composites: [definition] }),
    ).toThrow(/test\.invalidBoxConstraint.*children\[0\].*(proposal|axis|finite|min|max)/i);
  });

  it.each([
    { x: 0, y: 0, width: -1, height: 10 },
    { x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10 },
  ])('rejects invalid explicit allocation before publishing output: %o', allocationBounds => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidAllocation',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidAllocation'),
      }),
      compile: () => ({ allocationBounds, children: [boxNode()] }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidAllocation' }), { composites: [definition] }),
    ).toThrow(/test\.invalidAllocation.*children\[0\].*allocation/i);
  });

  it('snapshots dynamic explicit allocation fields before validation and publication', () => {
    let widthReads = 0;
    const allocationBounds = new Proxy(
      { x: 0, y: 0, width: 20, height: 10 },
      {
        get: (target, property, receiver) => {
          if (property === 'width') {
            widthReads += 1;
            return widthReads <= 3 ? 20 : Number.NaN;
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const child = defineComposite({
      namespace: 'test',
      type: 'dynamicAllocationChild',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('dynamicAllocationChild'),
      }),
      compile: () => ({ allocationBounds, children: [boxNode()] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'dynamicAllocationParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('dynamicAllocationParent'),
      }),
      artifactSchema: z.strictObject({ width: z.number() }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'dynamicAllocationChild' });
        return { children: [], artifact: { width: laid.allocationBounds.width } };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicAllocationParent' }), {
      composites: [child, parent],
    });

    expect(result.artifacts.find(value => value.kind === 'composite')?.value).toEqual({ width: 20 });
    expect(widthReads).toBe(1);
  });

  it('uses full fallback for a changed layout-aware composite and matches a fresh compile', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'runtimeBox',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('runtimeBox'),
        x: z.number(),
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(
          context,
          {
            type: 'scope',
            children: [
              { ...boxNode(), id: 'duplicate' },
              { ...boxNode(), id: 'duplicate' },
            ],
          },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 20 },
            y: { kind: LayoutAxisProposalKind.Exact, value: 20 },
          },
        );
        return {
          allocationBounds: { x: node.x, y: 0, width: 20, height: 20 },
          children: [context.replay(laid, { transforms: [{ kind: 'translate', x: node.x, y: 0 }] })],
        };
      },
    });
    const initial = sceneOf({ namespace: 'test', type: 'runtimeBox', x: 0 });
    const next = sceneOf({ namespace: 'test', type: 'runtimeBox', x: 30 });
    const options = { composites: [definition], onWarn: () => {} };
    const program = createCoreProgram(options);
    const owners = createRuntimeOwnerRegistry({ builtins: [CoreOwnerDefinition] });
    const programs = createRuntimeProgramRegistry({ owners, builtins: [program] });
    const session = createRuntimeSession({
      owners,
      programs,
      initialSnapshots: [createRuntimeOwnerInput(CoreOwnerDefinition, initial)],
    });

    const result = session.update({
      baseRevision: session.revision(),
      owners: [createRuntimeOwnerUpdate(CoreOwnerDefinition, next)],
    });
    const artifact = session.artifact(program).value;
    const freshDiagnostics: Array<CompileWarning> = [];
    const freshResult = compileToScene(next, {
      composites: [definition],
      onWarn: warning => freshDiagnostics.push(warning),
    });

    expect(result.outcome).toBe(RuntimeProgramKind.Fallback);
    expect(artifact.patch).toEqual({
      baseRevision: 0,
      nextRevision: 1,
      operations: [{ kind: 'replaceScene', snapshot: artifact.snapshot }],
    });
    expect(artifact.output).toEqual({ result: freshResult, diagnostics: freshDiagnostics, observerOutputs: [] });
    expect(artifact.output.diagnostics.map(warning => warning.code)).toContain(CompileWarningCode.DuplicateNodeId);
  });
});
