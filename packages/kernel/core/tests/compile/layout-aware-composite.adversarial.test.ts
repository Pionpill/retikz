import type { RuntimeRevision } from '@retikz/runtime';

import { describe, expect, it, vi } from 'vitest';
import { z } from 'zod';

import type {
  ClipShape,
  CompileWarning,
  CompositeReplay,
  IRChild,
  IRScene,
  JsonValue,
  LayoutChildFailure,
  LayoutChildResult,
  LayoutCompositeCompileContext,
  LayoutProposal,
  LowerTex,
  MarkerPrimitive,
  ScenePrimitive,
  TextMeasurer,
} from '../../src';

import {
  BUILTIN_SHAPES,
  ChildSchema,
  compileToScene,
  CompileWarningCode,
  CompositeBaseSchema,
  defineArrow,
  defineBoundary,
  defineClip,
  defineComposite,
  definePathGenerator,
  definePathKind,
  definePattern,
  defineRibbonWidthProfile,
  defineShape,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  lowerIRToKernel,
  NaturalLayoutProposal,
} from '../../src';
import { NamespaceStack } from '../../src/compile/namespace';
import { createCompileContext } from '../../src/compile/orchestration/context';
import * as runtimeTopology from '../../src/compile/orchestration/runtime-topology';
import { compileChildrenToPrimitives } from '../../src/compile/orchestration/traversal';
import {
  CompileInvariantError,
  CompositeContractError,
  isLayoutProbeRecoverableError,
  normalizeLayoutProbeError,
} from '../../src/compile/probe-failure';
import { snapshotProviderPosition } from '../../src/compile/scene-primitive';
import { cloneAndFreezeJson } from '../../src/shared/json';
import { arrowMarks } from '../helpers/arrow-marks';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
});

const BoundsSchema = z.strictObject({
  x: z.number(),
  y: z.number(),
  width: z.number(),
  height: z.number(),
});

const sceneOf = (...children: Array<IRChild>): IRScene => ({
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

const createBoundsProbe = () =>
  defineComposite({
    namespace: 'test',
    type: 'boundsProbe',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('boundsProbe'),
      child: ChildSchema,
      maxWidth: z.number().optional(),
    }),
    artifactSchema: z.strictObject({
      allocation: BoundsSchema,
      visual: BoundsSchema,
    }),
    compile: (node, context) => {
      const laid = resolvedResultOf(
        context,
        node.child,
        node.maxWidth === undefined
          ? NaturalLayoutProposal
          : {
              x: { kind: LayoutAxisProposalKind.Range, min: 0, max: node.maxWidth },
              y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
            },
      );
      return {
        children: [context.replay(laid)],
        artifact: {
          allocation: laid.allocationBounds,
          visual: laid.visualBounds,
        },
      };
    },
  });

describe('layout-aware composite constraints and bounds', () => {
  it('keeps margin in allocation while visual bounds follow paint and shadow', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'node',
          position: [0, 0],
          minimumSize: { width: 20, height: 10 },
          padding: 0,
          margin: 5,
          fill: '#f00',
          stroke: '#000',
          strokeOpacity: 0,
          shadow: {
            offsetX: 10,
            offsetY: -8,
            blur: 2,
            color: '#000',
          },
        },
      }),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts[0]?.value).toEqual({
      allocation: { x: -15, y: -10, width: 30, height: 20 },
      visual: { x: -12, y: -15, width: 34, height: 22 },
    });
  });

  it('treats maxWidth as a reflow upper bound without scaling fixed geometry', () => {
    const definition = createBoundsProbe();
    const pathResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 20,
        child: {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      }),
      { composites: [definition] },
    );
    const emptyTextResult = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        maxWidth: 0,
        child: {
          type: 'node',
          position: [0, 0],
          text: '',
          padding: 0,
          margin: 0,
          fillOpacity: 0,
          strokeOpacity: 0,
        },
      }),
      { composites: [definition], measureText: fixedMeasurer, padding: 0 },
    );

    expect(pathResult.artifacts[0]?.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });
    expect(emptyTextResult.artifacts[0]?.value).toMatchObject({
      allocation: { width: 0 },
      visual: { width: 0 },
    });
  });

  it('lays out Coordinate, Scope, and empty output with finite bounds', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf(
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'coordinate', id: 'point', position: [3, 4] },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: {
            type: 'scope',
            children: [
              {
                type: 'node',
                position: [10, 20],
                minimumSize: 10,
                padding: 0,
                margin: 0,
                fill: '#f00',
                strokeOpacity: 0,
              },
            ],
          },
        },
        {
          namespace: 'test',
          type: 'boundsProbe',
          child: { type: 'scope', children: [] },
        },
      ),
      { composites: [definition], padding: 0 },
    );

    expect(result.artifacts.map(artifact => artifact.value)).toMatchObject([
      {
        allocation: { x: 3, y: 4, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
      {
        allocation: { x: 5, y: 15, width: 10, height: 10 },
        visual: { x: 5, y: 15, width: 10, height: 10 },
      },
      {
        allocation: { x: 0, y: 0, width: 0, height: 0 },
        visual: { x: 0, y: 0, width: 0, height: 0 },
      },
    ]);
  });

  it('passes the exact full two-axis proposal through nested layout-aware composites', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedConstraint'),
      }),
      artifactSchema: z.strictObject({
        xValue: z.number(),
        yMin: z.number(),
        yHasMax: z.boolean(),
        frozen: z.boolean(),
      }),
      compile: (_, { proposal }) => {
        if (proposal.x.kind !== LayoutAxisProposalKind.Exact || proposal.y.kind !== LayoutAxisProposalKind.Range) {
          throw new Error('Expected exact/range proposal');
        }
        return {
          children: [],
          artifact: {
            xValue: proposal.x.value,
            yMin: proposal.y.min,
            yHasMax: proposal.y.max !== undefined,
            frozen: Object.isFrozen(proposal) && Object.isFrozen(proposal.x) && Object.isFrozen(proposal.y),
          },
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'constraintParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('constraintParent'),
      }),
      compile: (_, context) => {
        const child = resolvedResultOf(
          context,
          { namespace: 'test', type: 'nestedConstraint' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: 25 },
            y: { kind: LayoutAxisProposalKind.Range, min: 3 },
          },
        );
        return { children: [context.replay(child)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'constraintParent' }), {
      composites: [nested, parent],
    });

    expect(result.artifacts).toMatchObject([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'nestedConstraint',
        value: { xValue: 25, yMin: 3, yHasMax: false, frozen: true },
      },
    ]);
  });

  it('keeps arrow marker paint outside path allocation but inside visual bounds', () => {
    const definition = createBoundsProbe();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'boundsProbe',
        child: {
          type: 'path',
          marks: arrowMarks('->'),
          lineJoin: 'bevel',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: [100, 0] },
          ],
        },
      }),
      { composites: [definition], measureText: fixedMeasurer },
    );
    const artifact = result.artifacts[0];

    expect(artifact.value).toMatchObject({
      allocation: { x: 0, y: 0, width: 100, height: 0 },
    });
    if (artifact.kind !== 'composite') {
      throw new Error('Expected bounds artifact');
    }
    const { allocation, visual } = artifact.value;
    expect(visual.x).toBeLessThan(allocation.x);
    expect(visual.x + visual.width).toBeGreaterThanOrEqual(allocation.x + allocation.width);
    expect(visual.height).toBeGreaterThan(1);
  });

  it.each([
    {
      label: 'negative exact',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Exact, value: -1 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'NaN range min',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: Number.NaN, max: 10 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'infinite range max',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: Number.POSITIVE_INFINITY },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
    {
      label: 'descending range',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 11, max: 10 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      },
    },
  ])('rejects $label with the composite key and occurrence before child dispatch', ({ proposal }) => {
    let dispatched = false;
    const dispatchSentinel = defineComposite({
      namespace: 'test',
      type: 'dispatchSentinel',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('dispatchSentinel'),
      }),
      compile: () => {
        dispatched = true;
        return { children: [] };
      },
    });
    const definition = defineComposite({
      namespace: 'test',
      type: 'invalidConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidConstraint'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            namespace: 'test',
            type: 'dispatchSentinel',
          },
          proposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidConstraint' }), {
        composites: [definition, dispatchSentinel],
      }),
    ).toThrow(/test\.invalidConstraint.*children\[0\]/i);
    expect(dispatched).toBe(false);
  });

  it('keeps an invalid proposal from a nested composite fatal when its parent discards the probe', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'invalidNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'coordinate', id: 'point', position: [0, 0] },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: -1 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardInvalidNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardInvalidNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'invalidNestedProposal' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'discardInvalidNestedProposal' }), {
        composites: [parent, nested],
      }),
    ).toThrow(/test\.invalidNestedProposal.*proposal.*finite and non-negative/i);
  });

  it('keeps hostile proposal reflection fatal when a parent discards the nested probe', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'hostileNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileNestedProposal'),
      }),
      compile: (_, context) => {
        const hostileProposal = new Proxy(NaturalLayoutProposal, {
          ownKeys: () => {
            throw new Error('hostile proposal keys');
          },
        });
        context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, hostileProposal);
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardHostileNestedProposal',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardHostileNestedProposal'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileNestedProposal' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    let thrown: unknown;
    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'discardHostileNestedProposal' }), {
        composites: [parent, nested],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(CompositeContractError);
    expect(thrown).toMatchObject({
      message: expect.stringMatching(/test\.hostileNestedProposal.*invalid proposal.*validation failed/i),
    });
  });

  it.each([
    {
      name: 'intrinsic',
      axis: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    },
    {
      name: 'range',
      axis: { kind: LayoutAxisProposalKind.Range, min: 0, max: 10 },
    },
    {
      name: 'exact',
      axis: { kind: LayoutAxisProposalKind.Exact, value: 10 },
    },
  ])('reads every $name proposal field once before validation and detaches it', ({ axis }) => {
    const reads = new Map<PropertyKey, number>();
    const guardedAxis = new Proxy(axis, {
      get: (target, property, receiver) => {
        const count = (reads.get(property) ?? 0) + 1;
        reads.set(property, count);
        if (count > 1) throw new Error(`proposal field '${String(property)}' was read more than once`);
        return Reflect.get(target, property, receiver);
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `singleRead${axis.kind}ProposalParent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`singleRead${axis.kind}ProposalParent`),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          { type: 'coordinate', id: 'point', position: [0, 0] },
          { x: guardedAxis, y: NaturalLayoutProposal.y },
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Resolved);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `singleRead${axis.kind}ProposalParent` }), {
        composites: [parent],
      }),
    ).not.toThrow();
    expect([...reads.values()]).toEqual([...reads.values()].map(() => 1));
  });

  it.each([
    {
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    },
    {
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      z: { kind: LayoutAxisProposalKind.Exact, value: 10 },
    },
    {
      x: { kind: LayoutAxisProposalKind.Exact, value: 10, min: 0 },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    },
    {
      x: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural, max: 10 },
      y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
    },
  ])('rejects missing axes and unsupported proposal fields in %o', proposal => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'unsupportedConstraintField',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unsupportedConstraintField'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, proposal as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unsupportedConstraintField' }), { composites: [definition] }),
    ).toThrow(/test\.unsupportedConstraintField.*children\[0\].*proposal/i);
  });

  it('rejects unknown layout proposal kinds', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'unknownConstraintKind',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unknownConstraintKind'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, {
          x: { kind: 'mystery', value: 10 },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        } as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unknownConstraintKind' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.unknownConstraintKind.*children\[0\].*proposal.*mystery/i);
  });

  it('rejects unknown intrinsic proposal modes', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'unknownIntrinsicMode',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unknownIntrinsicMode'),
      }),
      compile: (_, { layoutChild }) => {
        layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, {
          x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'preferred' },
          y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
        } as never);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unknownIntrinsicMode' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.unknownIntrinsicMode.*children\[0\].*proposal.*preferred/i);
  });

  it('preserves explicit zero and canonicalizes negative zero before child dispatch and slot resolution', () => {
    let received: LayoutProposal | undefined;
    const nested = defineComposite({
      namespace: 'test',
      type: 'zeroChild',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('zeroChild'),
      }),
      compile: (_, context) => {
        received = context.proposal;
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'zeroParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('zeroParent'),
      }),
      artifactSchema: z.strictObject({ width: z.number(), height: z.number() }),
      compile: (_, context) => {
        const child = resolvedResultOf(
          context,
          { namespace: 'test', type: 'zeroChild' },
          {
            x: { kind: LayoutAxisProposalKind.Exact, value: -0 },
            y: { kind: LayoutAxisProposalKind.Range, min: -0, max: 0 },
          },
        );
        return { children: [], artifact: child.slotSize };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'zeroParent' }), {
      composites: [nested, parent],
    });

    expect(received).toEqual({
      x: { kind: 'exact', value: 0 },
      y: { kind: 'range', min: 0, max: 0 },
    });
    expect(Object.is(received?.x.kind === 'exact' ? received.x.value : undefined, -0)).toBe(false);
    expect(result.artifacts[0]?.value).toEqual({ width: 0, height: 0 });
    const size = result.artifacts[0]?.value as { width: number; height: number };
    expect(Object.is(size.width, -0)).toBe(false);
    expect(Object.is(size.height, -0)).toBe(false);
  });

  it('fails loudly when layoutChild depends on a later external reference', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forwardReference',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('forwardReference'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: { id: 'later' } },
            ],
          },
          NaturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf(
          { namespace: 'test', type: 'forwardReference' },
          { type: 'node', id: 'later', position: [20, 20], minimumSize: 10 },
        ),
        { composites: [definition] },
      ),
    ).toThrow(/later|reference|not found|unresolved/i);
  });

  it('turns ordinary Error and non-Error throws into opaque discardable failed probes', () => {
    const ordinaryCause = new Error('ordinary child failure');
    const thrownValue = Object.freeze({ reason: 'non-error child failure' });
    const ordinary = defineComposite({
      namespace: 'test',
      type: 'ordinaryFailure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('ordinaryFailure'),
      }),
      compile: () => {
        throw ordinaryCause;
      },
    });
    const nonError = defineComposite({
      namespace: 'test',
      type: 'nonErrorFailure',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nonErrorFailure'),
      }),
      compile: () => {
        throw thrownValue;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardFailures',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardFailures'),
      }),
      compile: (_, context) => {
        const probes = [
          context.layoutChild({ namespace: 'test', type: 'ordinaryFailure' }, NaturalLayoutProposal),
          context.layoutChild({ namespace: 'test', type: 'nonErrorFailure' }, NaturalLayoutProposal),
        ];
        for (const probe of probes) {
          expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
          if (probe.kind === LayoutChildProbeKind.Failed) {
            expect(Object.keys(probe.failure)).toEqual([]);
            expect(Object.isFrozen(probe.failure)).toBe(true);
            expect(Object.isFrozen(probe)).toBe(true);
          }
        }
        return { children: [] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'discardFailures' }), {
      composites: [ordinary, nonError, parent],
    });

    expect(result.scene.primitives).toEqual([]);
    expect(result.scene.resources ?? []).toEqual([]);
    expect(result.artifacts).toEqual([]);
  });

  it('preserves null and undefined causes and consumes a failure on its first raise', () => {
    let invocation = 0;
    const leaf = defineComposite({
      namespace: 'test',
      type: 'rawCauseLeaf',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('rawCauseLeaf') }),
      compile: () => {
        invocation += 1;
        if (invocation === 1) throw null;
        throw undefined;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'rawCauseParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('rawCauseParent') }),
      compile: (_, context) => {
        const causes: Array<unknown> = [];
        for (let index = 0; index < 2; index += 1) {
          const probe = context.layoutChild({ namespace: 'test', type: 'rawCauseLeaf' }, NaturalLayoutProposal);
          if (probe.kind === LayoutChildProbeKind.Resolved) throw new Error('expected failed probe');
          try {
            context.raise(probe.failure);
          } catch (error) {
            causes.push((error as Error & { cause?: unknown }).cause);
          }
          expect(() => context.raise(probe.failure)).toThrow(/already.*raised|consum/i);
        }
        expect(causes).toEqual([null, undefined]);
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'rawCauseParent' }), { composites: [leaf, parent] });
  });

  it('returns failed for an unregistered Composite in a probe without publishing its warning', () => {
    const warnings: Array<CompileWarning> = [];
    const parent = defineComposite({
      namespace: 'test',
      type: 'unregisteredProbeParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('unregisteredProbeParent') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ namespace: 'missing', type: 'leaf' }, NaturalLayoutProposal);
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'unregisteredProbeParent' }), {
      composites: [parent],
      onWarn: warning => warnings.push(warning),
    });
    expect(warnings).toEqual([]);
  });

  it('snapshots the real provider and deepest nested Scope occurrence for schema failure', () => {
    const leaf = defineComposite({
      namespace: 'test',
      type: 'deepSchemaLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('deepSchemaLeaf'),
        required: z.number(),
      }),
      compile: () => ({ children: [] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'deepSchemaParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('deepSchemaParent') }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'scope',
                children: [{ namespace: 'test', type: 'deepSchemaLeaf' }],
              },
            ],
          },
          NaturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'deepSchemaParent' }), { composites: [leaf, parent] }),
    ).toThrow(/test\.deepSchemaLeaf.*scopeChild\[0\]::scopeChild\[0\]/i);
  });

  it('promotes only the selected failure with provider, source, occurrence, and original cause', () => {
    const cause = new Error('selected candidate failed');
    const leaf = defineComposite({
      namespace: 'test',
      type: 'selectedFailureLeaf',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('selectedFailureLeaf'),
      }),
      compile: () => {
        throw cause;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'selectedFailureParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('selectedFailureParent'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'selectedFailureLeaf' }],
          },
          NaturalLayoutProposal,
        );
        if (probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);
        return { children: [] };
      },
    });

    let thrown: unknown;
    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'selectedFailureParent' }), {
        composites: [leaf, parent],
      });
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(Error);
    expect((thrown as Error).message).toMatch(/test\.selectedFailureLeaf.*children\[0\].*scopeChild\[0\]/i);
    expect((thrown as Error & { cause?: unknown }).cause).toBe(cause);
  });

  it('rejects forged, copied, cross-callback, and cross-compile failures', () => {
    let retained: LayoutChildFailure | undefined;
    let run = 0;
    const leaf = defineComposite({
      namespace: 'test',
      type: 'failureOwnerLeaf',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('failureOwnerLeaf') }),
      compile: () => {
        throw new Error('candidate failed');
      },
    });
    const producer = defineComposite({
      namespace: 'test',
      type: 'failureOwnerProducer',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('failureOwnerProducer') }),
      compile: (_, context) => {
        run += 1;
        if (run === 1) {
          const probe = context.layoutChild({ namespace: 'test', type: 'failureOwnerLeaf' }, NaturalLayoutProposal);
          if (probe.kind === LayoutChildProbeKind.Failed) retained = probe.failure;
          return { children: [] };
        }
        return context.raise(retained!);
      },
    });
    const copied = defineComposite({
      namespace: 'test',
      type: 'copiedFailure',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('copiedFailure') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ namespace: 'test', type: 'failureOwnerLeaf' }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Resolved) return { children: [] };
        return context.raise({ ...probe.failure });
      },
    });
    const forged = defineComposite({
      namespace: 'test',
      type: 'forgedFailure',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('forgedFailure') }),
      compile: (_, context) => context.raise(Object.freeze({}) as LayoutChildFailure),
    });
    const foreign = defineComposite({
      namespace: 'test',
      type: 'foreignFailure',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('foreignFailure') }),
      compile: (_, context) => context.raise(retained!),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'copiedFailure' }), { composites: [leaf, copied] }),
    ).toThrow(/failure.*forged|does not belong|callback/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'forgedFailure' }), { composites: [forged] }),
    ).toThrow(/failure.*forged|does not belong/i);
    expect(() =>
      compileToScene(
        sceneOf({ namespace: 'test', type: 'failureOwnerProducer' }, { namespace: 'test', type: 'foreignFailure' }),
        { composites: [leaf, producer, foreign] },
      ),
    ).toThrow(/failure.*callback|does not belong/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'failureOwnerProducer' }), { composites: [leaf, producer] }),
    ).toThrow(/failure.*compile|forged|does not belong/i);
  });

  it('lets branded Core invariants pierce the probe catch boundary', () => {
    const invariant = new CompileInvariantError('forced namespace invariant');
    const diff = vi.spyOn(NamespaceStack.prototype, 'diffTopFrame').mockImplementation(() => {
      throw invariant;
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'fatalInvariantParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('fatalInvariantParent') }),
      compile: (_, context) => {
        context.layoutChild({ type: 'coordinate', id: 'invariant', position: [0, 0] }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'fatalInvariantParent' }), { composites: [parent] }),
    ).toThrow(invariant);
    diff.mockRestore();
  });

  it('reaches a branded Runtime topology invariant through the real layoutChild catch boundary', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'runtimeTopologyInvariantParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('runtimeTopologyInvariantParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'scope', localNamespace: true, children: [] }, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const ir = sceneOf({ namespace: 'test', type: 'runtimeTopologyInvariantParent' });
    const outer = runtimeTopology.createRuntimeTopologyTracker(1 as RuntimeRevision);
    const actual = runtimeTopology.createRuntimeTopologyTracker(1 as RuntimeRevision);
    const broken = Object.freeze({
      ...actual,
      popNamespaceFrame: () => {
        actual.popNamespaceFrame();
        actual.popNamespaceFrame();
      },
    });
    const createProbeTracker = vi.spyOn(runtimeTopology, 'createRuntimeTopologyTracker').mockReturnValue(broken);
    const context = createCompileContext(ir, { composites: [parent] });

    expect(() => compileChildrenToPrimitives(ir.children, context, { identityTracker: outer })).toThrow(
      CompileInvariantError,
    );
    createProbeTracker.mockRestore();
  });

  it('does not downgrade an invalid layoutChild discriminator to a failed probe', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'invalidLayoutChildDiscriminatorParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidLayoutChildDiscriminatorParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ type: 'invalidLayoutChild' } as IRChild, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidLayoutChildDiscriminatorParent' }), {
        composites: [parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('rejects an accessor-backed layoutChild input before the recoverable dispatch boundary', () => {
    const hostileChild: Record<string, unknown> = { id: 'point', position: [0, 0] };
    Object.defineProperty(hostileChild, 'type', {
      enumerable: true,
      get: () => 'coordinate',
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileLayoutChildParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileLayoutChildParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(hostileChild as IRChild, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileLayoutChildParent' }), {
        composites: [parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('rejects automatic allocation bounds whose transformed edges become non-finite', () => {
    const parent = defineComposite({
      namespace: 'test',
      type: 'nonFiniteAutomaticAllocationParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nonFiniteAutomaticAllocationParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            transforms: [{ kind: 'scale', x: 2 }],
            children: [{ type: 'coordinate', id: 'far', position: [Number.MAX_VALUE, 0] }],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'nonFiniteAutomaticAllocationParent' }), {
        composites: [parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade malformed nested Composite output to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'malformedProbeChild',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('malformedProbeChild') }),
      compile: () => ({ children: undefined as unknown as Array<IRChild> }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedProbeParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('malformedProbeParent') }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'malformedProbeChild' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedProbeParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(/malformedProbeChild.*children|invalid.*children/i);
  });

  it('snapshots dynamic Composite result fields before validation and commit', () => {
    let childrenReads = 0;
    const result = new Proxy(
      { children: [{ type: 'node', position: [0, 0] }] as Array<IRChild> },
      {
        get: (target, property, receiver) => {
          if (property === 'children') {
            childrenReads += 1;
            return childrenReads === 1 ? target.children : {};
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const definition = defineComposite({
      namespace: 'test',
      type: 'dynamicCompileResult',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('dynamicCompileResult'),
      }),
      compile: () => result,
    });

    const compiled = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicCompileResult' }), {
      composites: [definition],
    });

    expect(compiled.scene.primitives.some(primitive => primitive.type === 'rect')).toBe(true);
    expect(childrenReads).toBe(1);
  });

  it('does not downgrade a sparse nested Composite children array to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseProbeChildren',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('sparseProbeChildren') }),
      compile: () => ({ children: Array<IRChild>(1) }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseProbeChildrenParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseProbeChildrenParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseProbeChildren' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseProbeChildrenParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade an invalid nested Composite output child to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'invalidOutputChild',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('invalidOutputChild') }),
      compile: () => ({ children: [{ type: 'bogus' } as IRChild] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'invalidOutputChildParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('invalidOutputChildParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'invalidOutputChild' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'invalidOutputChildParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(/invalidOutputChild.*output child.*index 0/i);
  });

  it('does not downgrade hostile nested Composite result reflection to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileCallbackResult',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('hostileCallbackResult') }),
      compile: () =>
        new Proxy(
          { children: [] },
          {
            has: () => {
              throw new Error('hostile callback result reflection');
            },
          },
        ),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileCallbackResultParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileCallbackResultParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileCallbackResult' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileCallbackResultParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade hostile nested replay wrapper reflection to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileReplayWrapper',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('hostileReplayWrapper') }),
      compile: (_, context) => {
        const probe = context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        const wrapper = new Proxy(
          {},
          {
            ownKeys: () => {
              throw new Error('hostile replay wrapper reflection');
            },
          },
        );
        return { children: [context.replay(probe.result, wrapper)] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileReplayWrapperParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileReplayWrapperParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileReplayWrapper' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileReplayWrapperParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('reads a replay wrapper clip once before validation and detaches it', () => {
    let clipReads = 0;
    const wrapper: Record<string, unknown> = {};
    Object.defineProperty(wrapper, 'clip', {
      enumerable: true,
      get: () => {
        clipReads += 1;
        return { kind: 'rect', x: 0, y: 0, width: 10, height: 10 };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'dynamicReplayWrapperClipParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('dynamicReplayWrapperClipParent'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result, wrapper)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'dynamicReplayWrapperClipParent' }), {
      composites: [parent],
    });

    expect(result.scene.resources?.filter(resource => resource.kind === 'clip')).toHaveLength(1);
    expect(clipReads).toBe(1);
  });

  it('does not downgrade sparse nested replay wrapper transforms to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseReplayWrapperTransforms',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseReplayWrapperTransforms'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild({ type: 'coordinate', id: 'point', position: [0, 0] }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: [context.replay(probe.result, { transforms: Array<never>(1) })] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseReplayWrapperTransformsParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseReplayWrapperTransformsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseReplayWrapperTransforms' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseReplayWrapperTransformsParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade hostile nested runtime Scope props reflection to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'hostileRuntimeScopeProps',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileRuntimeScopeProps'),
      }),
      compile: (_, context) => {
        const props = new Proxy(
          {},
          {
            ownKeys: () => {
              throw new Error('hostile runtime Scope props reflection');
            },
          },
        );
        return { children: [context.scope(props, [])] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileRuntimeScopePropsParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileRuntimeScopePropsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'hostileRuntimeScopeProps' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileRuntimeScopePropsParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade sparse nested runtime Scope transforms to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeTransforms',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseRuntimeScopeTransforms'),
      }),
      compile: (_, context) => ({ children: [context.scope({ transforms: Array<never>(1) }, [])] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeTransformsParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseRuntimeScopeTransformsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseRuntimeScopeTransforms' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseRuntimeScopeTransformsParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('does not downgrade sparse nested runtime Scope children to a failed probe', () => {
    const malformed = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeChildren',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseRuntimeScopeChildren'),
      }),
      compile: (_, context) => ({ children: [context.scope({}, Array<IRChild>(1))] }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'sparseRuntimeScopeChildrenParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('sparseRuntimeScopeChildrenParent'),
      }),
      compile: (_, context) => {
        context.layoutChild({ namespace: 'test', type: 'sparseRuntimeScopeChildren' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'sparseRuntimeScopeChildrenParent' }), {
        composites: [malformed, parent],
      }),
    ).toThrow(CompositeContractError);
  });

  it('keeps detailed expanded child compilation on the existing dispatch path', () => {
    const expanded = defineComposite({
      namespace: 'test',
      type: 'singleRectangleExpand',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('singleRectangleExpand'),
      }),
      expand: () => ({
        children: [
          {
            type: 'path',
            children: [{ type: 'step', kind: 'rectangle', from: [0, 0], to: [10, 6] }],
          },
        ],
      }),
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'singleRectangleExpand' }), {
      composites: [expanded],
    });

    expect(result.scene.primitives).toEqual([
      expect.objectContaining({
        type: 'path',
        commands: [
          { kind: 'move', to: [0, 0] },
          { kind: 'line', to: [10, 0] },
          { kind: 'line', to: [10, 6] },
          { kind: 'line', to: [0, 6] },
          { kind: 'close' },
        ],
      }),
    ]);
  });

  it.each([{ variant: 'invalidChild' as const }, { variant: 'hostileArray' as const }])(
    'does not downgrade $variant expand output to a failed probe',
    ({ variant }) => {
      const expanded = defineComposite({
        namespace: 'test',
        type: `malformedExpand${variant}`,
        schema: CompositeBaseSchema.extend({
          namespace: z.literal('test'),
          type: z.literal(`malformedExpand${variant}`),
        }),
        expand: () =>
          variant === 'invalidChild'
            ? ({ children: [{ type: 'bogus' } as IRChild] } as never)
            : ({
                children: new Proxy(
                  [{ type: 'coordinate' as const, id: 'point', position: [0, 0] as [number, number] }],
                  {
                    get: (target, property, receiver) => {
                      if (property === 'map') throw new Error('hostile expand output iteration');
                      return Reflect.get(target, property, receiver);
                    },
                  },
                ),
              } as never),
      });
      const parent = defineComposite({
        namespace: 'test',
        type: `malformedExpand${variant}Parent`,
        schema: CompositeBaseSchema.extend({
          namespace: z.literal('test'),
          type: z.literal(`malformedExpand${variant}Parent`),
        }),
        compile: (_, context) => {
          context.layoutChild({ namespace: 'test', type: `malformedExpand${variant}` }, NaturalLayoutProposal);
          return { children: [] };
        },
      });

      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: `malformedExpand${variant}Parent` }), {
          composites: [expanded, parent],
        }),
      ).toThrow(CompositeContractError);
    },
  );

  it('lets malformed provider geometry and text metrics pierce the probe catch boundary', () => {
    const malformedShape = defineShape({
      name: 'malformedProbeShape',
      paramsSchema: z.strictObject({}),
      circumscribe: () => ({ halfWidth: Number.NaN, halfHeight: 1 }),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });
    const shapeParent = defineComposite({
      namespace: 'test',
      type: 'malformedShapeParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('malformedShapeParent') }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'malformedProbeShape', params: {} } },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });
    const metricsParent = defineComposite({
      namespace: 'test',
      type: 'malformedMetricsParent',
      schema: CompositeBaseSchema.extend({ namespace: z.literal('test'), type: z.literal('malformedMetricsParent') }),
      compile: (_, context) => {
        context.layoutChild({ type: 'node', position: [0, 0], text: 'bad metrics' }, NaturalLayoutProposal);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedShapeParent' }), {
        composites: [shapeParent],
        shapes: [malformedShape],
      }),
    ).toThrow(/malformedProbeShape.*circumscribe/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedMetricsParent' }), {
        composites: [metricsParent],
        measureText: () => ({ width: Number.NaN, height: 10 }),
      }),
    ).toThrow(/normalizeTextMetrics.*width/i);
  });

  it.each([
    {
      variant: 'plainBody' as const,
      child: { type: 'node' as const, position: [0, 0] as [number, number], text: 'plain body' },
    },
    {
      variant: 'mixedBody' as const,
      child: {
        type: 'node' as const,
        position: [0, 0] as [number, number],
        text: [{ runs: [{ text: 'mixed body' }] }],
      },
    },
    {
      variant: 'mixedLabel' as const,
      child: {
        type: 'node' as const,
        position: [0, 0] as [number, number],
        label: { text: { runs: [{ text: 'mixed label' }] }, position: 'center' as const },
      },
    },
    {
      variant: 'plainPathLabel' as const,
      child: {
        type: 'path' as const,
        children: [
          { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
          {
            type: 'step' as const,
            kind: 'line' as const,
            to: [20, 0] as [number, number],
            label: { text: 'plain path label' },
          },
        ],
      },
    },
  ])('keeps hostile measureText output fatal for $variant inside a discarded probe', ({ variant, child }) => {
    const parent = defineComposite({
      namespace: 'test',
      type: `hostileMetrics${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`hostileMetrics${variant}Parent`),
      }),
      compile: (_, context) => {
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const measureText: TextMeasurer = () =>
      new Proxy(
        { width: 10, height: 10, ascent: 8, descent: 2 },
        {
          ownKeys: () => {
            throw new Error(`hostile ${variant} metrics reflection`);
          },
        },
      );

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostileMetrics${variant}Parent` }), {
        composites: [parent],
        measureText,
      }),
    ).toThrow(CompositeContractError);
  });

  it.each([
    { variant: 'hostileBodyRoot' as const },
    { variant: 'invalidBodyCommand' as const },
    { variant: 'invalidBodyPaint' as const },
    { variant: 'invalidLabelMetrics' as const },
  ])('keeps malformed lowerTex output fatal for $variant inside a discarded probe', ({ variant }) => {
    const parent = defineComposite({
      namespace: 'test',
      type: `malformedTex${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`malformedTex${variant}Parent`),
      }),
      compile: (_, context) => {
        const child: IRChild =
          variant === 'invalidLabelMetrics'
            ? {
                type: 'node',
                position: [0, 0],
                label: { text: { runs: [{ tex: 'x' }] }, position: 'center' },
              }
            : {
                type: 'node',
                position: [0, 0],
                text: [{ runs: [{ tex: 'x' }] }],
              };
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const lowerTex: LowerTex = () => {
      if (variant === 'hostileBodyRoot') {
        return new Proxy(
          { paths: [], width: 10, height: 10, depth: 2 },
          {
            ownKeys: () => {
              throw new Error('hostile lowerTex root reflection');
            },
          },
        );
      }
      if (variant === 'invalidLabelMetrics') return { paths: [], width: -1, height: 10, depth: 2 };
      return {
        paths: [
          {
            commands:
              variant === 'invalidBodyCommand'
                ? ([{ kind: 'line', to: [Number.NaN, 0] }] as never)
                : [{ kind: 'move', to: [0, 0] }],
            fill:
              variant === 'invalidBodyPaint' ? ({ kind: 'unsupported' } as never) : ({ kind: 'currentColor' } as const),
            stroke: { kind: 'none' },
          },
        ],
        width: 10,
        height: 10,
        depth: 2,
      };
    };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `malformedTex${variant}Parent` }), {
        composites: [parent],
        lowerTex,
      }),
    ).toThrow(CompositeContractError);
  });

  it.each(['measureText', 'lowerTex'] as const)('keeps an ordinary %s execution throw recoverable', provider => {
    const parent = defineComposite({
      namespace: 'test',
      type: `throwing${provider}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`throwing${provider}Parent`),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            text: provider === 'measureText' ? 'plain' : [{ runs: [{ tex: 'x' }] }],
          },
          NaturalLayoutProposal,
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        return { children: [] };
      },
    });
    const options =
      provider === 'measureText'
        ? {
            composites: [parent],
            measureText: (): never => {
              throw new Error('ordinary measureText execution failure');
            },
          }
        : {
            composites: [parent],
            lowerTex: (): never => {
              throw new Error('ordinary lowerTex execution failure');
            },
          };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `throwing${provider}Parent` }), options),
    ).not.toThrow();
  });

  it('keeps hostile Shape circumscribe output reflection fatal inside a discarded probe', () => {
    const hostileShape = defineShape({
      name: 'hostileCircumscribeShape',
      paramsSchema: z.strictObject({}),
      circumscribe: () =>
        new Proxy(
          { halfWidth: 10, halfHeight: 10 },
          {
            has: () => {
              throw new Error('hostile circumscribe reflection');
            },
          },
        ),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileCircumscribeParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileCircumscribeParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'hostileCircumscribeShape', params: {} } },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileCircumscribeParent' }), {
        composites: [parent],
        shapes: [hostileShape],
      }),
    ).toThrow(CompositeContractError);
  });

  it.each([
    { variant: 'boundaryPoint' as const, anchor: undefined },
    { variant: 'shapeAnchor' as const, anchor: 'right' as const },
    { variant: 'shapeEdgePoint' as const, anchor: { side: 'top' as const, fraction: 0.5 } },
    { variant: 'boundaryAnchor' as const, anchor: 'right' as const },
  ])('keeps hostile $variant output reflection fatal inside a discarded probe', ({ variant, anchor }) => {
    const hostilePoint = () =>
      new Proxy([10, 0] as [number, number], {
        get: () => {
          throw new Error(`hostile ${variant} reflection`);
        },
      });
    const hostileShape = defineShape({
      name: 'hostilePointShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: variant === 'boundaryPoint' ? hostilePoint : BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: variant === 'shapeAnchor' ? hostilePoint : BUILTIN_SHAPES.rectangle.anchor,
      edgePoint: variant === 'shapeEdgePoint' ? hostilePoint : BUILTIN_SHAPES.rectangle.edgePoint,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });
    const hostileBoundary = defineBoundary({
      name: 'hostilePointBoundary',
      paramsSchema: z.strictObject({}),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: variant === 'boundaryAnchor' ? hostilePoint : BUILTIN_SHAPES.rectangle.anchor,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `hostile${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`hostile${variant}Parent`),
      }),
      compile: (_, context) => {
        const target = {
          id: 'target',
          ...(anchor === undefined ? {} : { anchor }),
          ...(variant === 'boundaryAnchor' ? { boundary: 'hostilePointBoundary' } : {}),
        };
        context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'target',
                position: [0, 0],
                shape: { type: 'hostilePointShape', params: {} },
              },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [100, 0] },
                  { type: 'step', kind: 'line', to: target },
                ],
              },
            ],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostile${variant}Parent` }), {
        composites: [parent],
        shapes: [hostileShape],
        boundaries: [hostileBoundary],
      }),
    ).toThrow(CompositeContractError);
  });

  it('keeps hostile Shape scaleParams output reflection fatal inside a discarded probe', () => {
    const hostileShape = defineShape({
      name: 'hostileScaleParamsShape',
      paramsSchema: z.strictObject({ radius: z.number() }),
      scaleParams: () =>
        new Proxy(
          { radius: 10 },
          {
            ownKeys: () => {
              throw new Error('hostile scaleParams reflection');
            },
          },
        ),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileScaleParamsParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileScaleParamsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            scale: 2,
            shape: { type: 'hostileScaleParamsShape', params: { radius: 5 } },
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileScaleParamsParent' }), {
        composites: [parent],
        shapes: [hostileShape],
      }),
    ).toThrow(CompositeContractError);
  });

  it.each([
    { variant: 'connectionEnvelope' as const, boundary: 'circle' },
    { variant: 'resolveRect' as const, boundary: 'hostileRectBoundary' },
  ])('keeps hostile $variant output reflection fatal inside a discarded probe', ({ variant, boundary }) => {
    const hostileEnvelopeShape = defineShape({
      name: 'hostileEnvelopeShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      connectionEnvelope: () =>
        new Proxy(
          { halfWidth: 10, halfHeight: 10 },
          {
            get: () => {
              throw new Error('hostile connection envelope reflection');
            },
          },
        ),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });
    const hostileBoundary = defineBoundary({
      name: 'hostileRectBoundary',
      paramsSchema: z.strictObject({}),
      resolveRect: context =>
        new Proxy(context.visualRect, {
          get: () => {
            throw new Error('hostile boundary rect reflection');
          },
        }),
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: `hostile${variant}Parent`,
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal(`hostile${variant}Parent`),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            children: [
              {
                type: 'node',
                id: 'target',
                position: [0, 0],
                shape: { type: 'hostileEnvelopeShape', params: {} },
                boundary,
              },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [100, 0] },
                  { type: 'step', kind: 'line', to: { id: 'target' } },
                ],
              },
            ],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: `hostile${variant}Parent` }), {
        composites: [parent],
        shapes: [hostileEnvelopeShape],
        boundaries: [hostileBoundary],
      }),
    ).toThrow(CompositeContractError);
  });

  it.each([
    { label: 'null', output: null },
    { label: 'undefined', output: undefined },
  ])('keeps a Boundary resolveRect $label output fatal inside a discarded probe', ({ output }) => {
    const malformedBoundary = defineBoundary({
      name: 'nullishRectBoundary',
      paramsSchema: z.strictObject({}),
      resolveRect: () => output as never,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'nullishRectBoundaryParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nullishRectBoundaryParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'scope',
            children: [
              { type: 'node', id: 'target', position: [0, 0], boundary: 'nullishRectBoundary' },
              {
                type: 'path',
                children: [
                  { type: 'step', kind: 'move', to: [100, 0] },
                  { type: 'step', kind: 'line', to: { id: 'target' } },
                ],
              },
            ],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'nullishRectBoundaryParent' }), {
        composites: [parent],
        boundaries: [malformedBoundary],
      }),
    ).toThrow(CompositeContractError);
  });

  it('keeps hostile path-generator output iteration fatal inside a discarded probe', () => {
    const hostileGenerator = definePathGenerator({
      name: 'hostileGeneratedCommands',
      paramsSchema: z.strictObject({}),
      generate: () =>
        new Proxy([{ kind: 'line' as const, to: [10, 0] as [number, number] }], {
          get: (target, property, receiver) => {
            if (property === Symbol.iterator) throw new Error('hostile path command iteration');
            return Reflect.get(target, property, receiver);
          },
        }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostilePathGeneratorParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostilePathGeneratorParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'path',
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'generator', name: 'hostileGeneratedCommands', params: {} },
            ],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostilePathGeneratorParent' }), {
        composites: [parent],
        pathGenerators: [hostileGenerator],
      }),
    ).toThrow(CompositeContractError);
  });

  it('keeps hostile PathKind compile output reflection fatal inside a discarded probe', () => {
    const hostilePathKind = definePathKind({
      schema: z.object({ kind: z.literal('hostilePathKind') }),
      compile: () =>
        new Proxy(
          { primitives: [], boundsPoints: [] },
          {
            get: () => {
              throw new Error('hostile path kind result reflection');
            },
          },
        ),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostilePathKindParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostilePathKindParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'path',
            kind: 'hostilePathKind',
            children: [{ type: 'step', kind: 'move', to: [0, 0] }],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostilePathKindParent' }), {
        composites: [parent],
        pathKinds: [hostilePathKind],
      }),
    ).toThrow(CompositeContractError);
  });

  it('snapshots dynamic PathKind bounds points before validation and layout publication', () => {
    let boundsPointsReads = 0;
    let xReads = 0;
    const point = new Proxy([10, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          xReads += 1;
          return xReads <= 2 ? 10 : Number.NaN;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const result = new Proxy(
      { primitives: [], boundsPoints: [point] },
      {
        get: (target, property, receiver) => {
          if (property === 'boundsPoints') {
            boundsPointsReads += 1;
            return boundsPointsReads === 1 ? target.boundsPoints : [];
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const dynamicPathKind = definePathKind({
      schema: z.strictObject({ kind: z.literal('dynamicPathKind') }),
      compile: () => result,
    });

    const compiled = compileToScene(
      sceneOf({
        type: 'path',
        kind: 'dynamicPathKind',
        children: [{ type: 'step', kind: 'move', to: [0, 0] }],
      }),
      { pathKinds: [dynamicPathKind] },
    );

    expect(compiled.scene.layout).toMatchObject({ width: 20, height: 20 });
    expect({ boundsPointsReads, xReads }).toEqual({ boundsPointsReads: 1, xReads: 1 });
  });

  it('keeps non-finite Ribbon width profile output fatal inside a discarded probe', () => {
    const malformedProfile = defineRibbonWidthProfile({
      name: 'malformedRibbonWidth',
      widthAt: () => Number.NaN,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedRibbonWidthParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('malformedRibbonWidthParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'path',
            kind: 'ribbon',
            ribbon: {
              width: { kind: 'profile', name: 'malformedRibbonWidth' },
              samples: 2,
            },
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'malformedRibbonWidthParent' }), {
        composites: [parent],
        ribbonWidthProfiles: [malformedProfile],
      }),
    ).toThrow(CompositeContractError);
  });

  it('lets structurally malformed shape, arrow, pattern, clip, and path-generator outputs pierce a discarded probe', () => {
    const badShape = defineShape({
      name: 'badEmitShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: (() => [{ type: 'rect', x: 0, y: 0, width: -1, height: 2 }]) as unknown as () => Iterable<ScenePrimitive>,
    });
    const badArrow = defineArrow({
      name: 'badEmitArrow',
      lineContactX: 0,
      emit: (() => [{ type: 'rect', x: 0, y: 0, width: -1, height: 2 }]) as unknown as () => Iterable<MarkerPrimitive>,
    });
    const badPattern = definePattern({
      name: 'badEmitPattern',
      emit: (() => [
        { type: 'group', children: [{ type: 'rect', x: 0, y: 0, width: -1, height: 2 }] },
      ]) as unknown as () => Iterable<MarkerPrimitive>,
    });
    const badClip = defineClip({
      kind: 'badResolvedClip',
      schema: z.strictObject({ kind: z.literal('badResolvedClip') }),
      resolve: (() => ({
        kind: 'compound',
        children: [{ kind: 'rect', x: 0, y: 0, width: -1, height: 2 }],
      })) as unknown as () => ClipShape,
    });
    const badGenerator = definePathGenerator({
      name: 'badGeneratedArc',
      paramsSchema: z.strictObject({}),
      generate: (() => [{ kind: 'arc', center: [0, 0], radius: -1, startAngle: 0, endAngle: 90 }]) as never,
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedProviderParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('malformedProviderParent'),
        variant: z.enum(['shape', 'arrow', 'pattern', 'clip', 'pathGenerator']),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'shape'
            ? { type: 'node', position: [0, 0], shape: { type: 'badEmitShape', params: {} } }
            : value.variant === 'arrow'
              ? {
                  type: 'path',
                  marks: arrowMarks('->', { shape: 'badEmitArrow' }),
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [10, 0] },
                  ],
                }
              : value.variant === 'pattern'
                ? {
                    type: 'node',
                    position: [0, 0],
                    fill: { kind: 'pattern', shape: 'badEmitPattern' },
                  }
                : value.variant === 'clip'
                  ? {
                      type: 'scope',
                      clip: { kind: 'badResolvedClip' } as never,
                      children: [{ type: 'node', position: [0, 0] }],
                    }
                  : {
                      type: 'path',
                      children: [
                        { type: 'step', kind: 'move', to: [0, 0] },
                        { type: 'step', kind: 'generator', name: 'badGeneratedArc', params: {} },
                      ],
                    };
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: [badShape],
      arrows: [badArrow],
      patterns: [badPattern],
      clips: [badClip],
      pathGenerators: [badGenerator],
    };

    for (const variant of ['shape', 'arrow', 'pattern', 'clip', 'pathGenerator'] as const) {
      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'malformedProviderParent', variant }), options),
      ).toThrow(/emit|primitive|invalid|root shape|path command/i);
    }
  });

  it('lets malformed fonts, shadows, and cyclic provider trees pierce a discarded probe', () => {
    const invalidText = (overrides: Record<string, unknown>): ScenePrimitive =>
      ({
        type: 'text',
        x: 0,
        y: 0,
        lines: [{ text: 'bad' }],
        fontSize: 12,
        align: 'start',
        baseline: 'alphabetic',
        lineHeight: 14,
        measuredWidth: 20,
        measuredHeight: 14,
        ...overrides,
      }) as unknown as ScenePrimitive;
    const invalidShadowRect = (shadow: unknown): ScenePrimitive =>
      ({ type: 'rect', x: 0, y: 0, width: 1, height: 1, shadow }) as unknown as ScenePrimitive;
    const cyclicSceneGroup: { type: 'group'; children: Array<ScenePrimitive> } = {
      type: 'group',
      children: [],
    };
    cyclicSceneGroup.children.push(cyclicSceneGroup);
    const shapeOutputs = new Map<string, ScenePrimitive>([
      ['fontFamilyFunctionShape', invalidText({ fontFamily: () => 'sans-serif' })],
      ['fontWeightObjectShape', invalidText({ fontWeight: {} })],
      ['fontWeightInfinityShape', invalidText({ fontWeight: Number.POSITIVE_INFINITY })],
      ['shadowMissingOffsetXShape', invalidShadowRect({ offsetY: 0, color: '#000' })],
      ['shadowMissingOffsetYShape', invalidShadowRect({ offsetX: 0, color: '#000' })],
      ['shadowMissingColorShape', invalidShadowRect({ offsetX: 0, offsetY: 0 })],
      ['shadowNegativeBlurShape', invalidShadowRect({ offsetX: 0, offsetY: 0, color: '#000', blur: -1 })],
      ['shadowOpacityHighShape', invalidShadowRect({ offsetX: 0, offsetY: 0, color: '#000', opacity: 2 })],
      ['cyclicSceneGroupShape', cyclicSceneGroup],
    ]);
    const badShapes = [...shapeOutputs].map(([name, primitive]) =>
      defineShape({
        name,
        paramsSchema: z.strictObject({}),
        circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
        boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
        anchor: BUILTIN_SHAPES.rectangle.anchor,
        emit: () => [primitive],
      }),
    );
    const cyclicMarkerGroup: { type: 'group'; children: Array<MarkerPrimitive> } = {
      type: 'group',
      children: [],
    };
    cyclicMarkerGroup.children.push(cyclicMarkerGroup);
    const cyclicArrow = defineArrow({
      name: 'cyclicMarkerArrow',
      lineContactX: 0,
      emit: () => [cyclicMarkerGroup],
    });
    const cyclicClipShape: { kind: 'compound'; children: Array<ClipShape> } = {
      kind: 'compound',
      children: [],
    };
    cyclicClipShape.children.push(cyclicClipShape);
    const cyclicClip = defineClip({
      kind: 'cyclicCompoundClip',
      schema: z.strictObject({ kind: z.literal('cyclicCompoundClip') }),
      resolve: () => cyclicClipShape,
    });
    const variants = [
      'fontFamilyFunctionShape',
      'fontWeightObjectShape',
      'fontWeightInfinityShape',
      'shadowMissingOffsetXShape',
      'shadowMissingOffsetYShape',
      'shadowMissingColorShape',
      'shadowNegativeBlurShape',
      'shadowOpacityHighShape',
      'cyclicSceneGroupShape',
      'cyclicMarkerArrow',
      'cyclicCompoundClip',
    ] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'malformedRecursiveProviderParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('malformedRecursiveProviderParent'),
        variant: z.enum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'cyclicMarkerArrow'
            ? {
                type: 'path',
                marks: arrowMarks('->', { shape: 'cyclicMarkerArrow' }),
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [10, 0] },
                ],
              }
            : value.variant === 'cyclicCompoundClip'
              ? {
                  type: 'scope',
                  clip: { kind: 'cyclicCompoundClip' } as never,
                  children: [{ type: 'node', position: [0, 0] }],
                }
              : {
                  type: 'node',
                  position: [0, 0],
                  shape: { type: value.variant, params: {} },
                };
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: badShapes,
      arrows: [cyclicArrow],
      clips: [cyclicClip],
    };

    for (const variant of variants) {
      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'malformedRecursiveProviderParent', variant }), options),
      ).toThrow(/emit|invalid|cyclic|root shape/i);
    }
  });

  it('rejects lossy animation tracks and symbol-keyed provider output in a discarded probe', () => {
    const validTrack = (): Record<PropertyKey, unknown> => ({
      property: 'opacity',
      keyframes: [
        { at: 0, value: 0 },
        { at: 1, value: 1 },
      ],
      duration: 100,
    });
    const functionTrack = validTrack();
    functionTrack.extra = () => 'not JSON';
    const unknownTrack = validTrack();
    unknownTrack.extra = 'schema would strip this';
    const nestedUnknownTrack = validTrack();
    nestedUnknownTrack.keyframes = [
      { at: 0, value: 0, extra: true },
      { at: 1, value: 1 },
    ];
    const triggerUnknownTrack = validTrack();
    triggerUnknownTrack.trigger = { onEvent: 'activate', extra: true };
    const cyclicTrack = validTrack();
    cyclicTrack.self = cyclicTrack;
    const animatedRect = (track: Record<PropertyKey, unknown>): ScenePrimitive =>
      ({
        type: 'rect',
        x: 0,
        y: 0,
        width: 1,
        height: 1,
        animations: [track],
      }) as unknown as ScenePrimitive;
    const symbolShapeRect: Record<PropertyKey, unknown> = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    symbolShapeRect[Symbol('shape-hidden-function')] = () => 'hidden';
    const shapeOutputs = new Map<string, ScenePrimitive>([
      ['animationFunctionShape', animatedRect(functionTrack)],
      ['animationUnknownShape', animatedRect(unknownTrack)],
      ['animationNestedUnknownShape', animatedRect(nestedUnknownTrack)],
      ['animationTriggerUnknownShape', animatedRect(triggerUnknownTrack)],
      ['animationCycleShape', animatedRect(cyclicTrack)],
      ['symbolKeyShape', symbolShapeRect as unknown as ScenePrimitive],
    ]);
    const badShapes = [...shapeOutputs].map(([name, primitive]) =>
      defineShape({
        name,
        paramsSchema: z.strictObject({}),
        circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
        boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
        anchor: BUILTIN_SHAPES.rectangle.anchor,
        emit: () => [primitive],
      }),
    );
    const symbolMarker: Record<PropertyKey, unknown> = {
      type: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    symbolMarker[Symbol('marker-hidden-function')] = () => 'hidden';
    const badArrow = defineArrow({
      name: 'symbolKeyMarkerArrow',
      lineContactX: 0,
      emit: () => [symbolMarker as unknown as MarkerPrimitive],
    });
    const symbolClipShape: Record<PropertyKey, unknown> = {
      kind: 'rect',
      x: 0,
      y: 0,
      width: 1,
      height: 1,
    };
    symbolClipShape[Symbol('clip-hidden-function')] = () => 'hidden';
    const badClip = defineClip({
      kind: 'symbolKeyClip',
      schema: z.strictObject({ kind: z.literal('symbolKeyClip') }),
      resolve: () => symbolClipShape as unknown as ClipShape,
    });
    const variants = [
      'animationFunctionShape',
      'animationUnknownShape',
      'animationNestedUnknownShape',
      'animationTriggerUnknownShape',
      'animationCycleShape',
      'symbolKeyShape',
      'symbolKeyMarkerArrow',
      'symbolKeyClip',
    ] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'strictProviderOutputParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('strictProviderOutputParent'),
        variant: z.enum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'symbolKeyMarkerArrow'
            ? {
                type: 'path',
                marks: arrowMarks('->', { shape: 'symbolKeyMarkerArrow' }),
                children: [
                  { type: 'step', kind: 'move', to: [0, 0] },
                  { type: 'step', kind: 'line', to: [10, 0] },
                ],
              }
            : value.variant === 'symbolKeyClip'
              ? {
                  type: 'scope',
                  clip: { kind: 'symbolKeyClip' } as never,
                  children: [{ type: 'node', position: [0, 0] }],
                }
              : {
                  type: 'node',
                  position: [0, 0],
                  shape: { type: value.variant, params: {} },
                };
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: badShapes,
      arrows: [badArrow],
      clips: [badClip],
    };

    for (const variant of variants) {
      expect(() =>
        compileToScene(sceneOf({ namespace: 'test', type: 'strictProviderOutputParent', variant }), options),
      ).toThrow(/animation|cyclic|invalid|non-JSON|symbol|unsupported/i);
    }
  });

  it('classifies returned Scene, Marker, and Clip Proxy traps as fatal output violations', () => {
    const hostileThrown = Proxy.revocable({}, {});
    hostileThrown.revoke();
    const sceneTrap = hostileThrown.proxy;
    const sceneProxy = new Proxy(
      { type: 'rect', x: 0, y: 0, width: 1, height: 1 },
      {
        ownKeys: () => {
          throw sceneTrap;
        },
      },
    );
    const proxyShape = defineShape({
      name: 'proxyTrapShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: () => [sceneProxy as unknown as ScenePrimitive],
    });
    const markerTrap = new Error('marker iterator trap');
    const markerIterable = {
      [Symbol.iterator]: (): Iterator<MarkerPrimitive> => ({
        next: () => {
          throw markerTrap;
        },
      }),
    };
    const proxyArrow = defineArrow({
      name: 'proxyTrapArrow',
      lineContactX: 0,
      emit: () => markerIterable,
    });
    const clipTrap = new Error('clip getPrototypeOf trap');
    const clipProxy = new Proxy(
      { kind: 'rect', x: 0, y: 0, width: 1, height: 1 },
      {
        getPrototypeOf: () => {
          throw clipTrap;
        },
      },
    );
    const proxyClip = defineClip({
      kind: 'proxyTrapClip',
      schema: z.strictObject({ kind: z.literal('proxyTrapClip') }),
      resolve: () => clipProxy as unknown as ClipShape,
    });
    const variants = ['scene', 'marker', 'clip'] as const;
    const parent = defineComposite({
      namespace: 'test',
      type: 'proxyTrapParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('proxyTrapParent'),
        variant: z.enum(variants),
      }),
      compile: (value, context) => {
        const child: IRChild =
          value.variant === 'scene'
            ? { type: 'node', position: [0, 0], shape: { type: 'proxyTrapShape', params: {} } }
            : value.variant === 'marker'
              ? {
                  type: 'path',
                  marks: arrowMarks('->', { shape: 'proxyTrapArrow' }),
                  children: [
                    { type: 'step', kind: 'move', to: [0, 0] },
                    { type: 'step', kind: 'line', to: [10, 0] },
                  ],
                }
              : {
                  type: 'scope',
                  clip: { kind: 'proxyTrapClip' } as never,
                  children: [{ type: 'node', position: [0, 0] }],
                };
        context.layoutChild(child, NaturalLayoutProposal);
        return { children: [] };
      },
    });
    const options = {
      composites: [parent],
      shapes: [proxyShape],
      arrows: [proxyArrow],
      clips: [proxyClip],
    };
    const causes = { scene: sceneTrap, marker: markerTrap, clip: clipTrap };

    for (const variant of variants) {
      let thrown: unknown;
      try {
        compileToScene(sceneOf({ namespace: 'test', type: 'proxyTrapParent', variant }), options);
      } catch (cause) {
        thrown = cause;
      }
      expect(thrown).toBeInstanceOf(CompositeContractError);
      expect((thrown as Error & { cause?: unknown }).cause).toBe(causes[variant]);
    }
  });

  it('snapshots a dynamic Shape Scene primitive before validation and downstream use', () => {
    let xReads = 0;
    const dynamicRect = new Proxy({ type: 'rect', x: 0, y: 0, width: 10, height: 10 } as const, {
      get: (target, property, receiver) => {
        if (property === 'x') {
          xReads += 1;
          return xReads === 1 ? 0 : Number.NaN;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicShape = defineShape({
      name: 'dynamicScenePrimitiveShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: () => [dynamicRect],
    });

    const result = compileToScene(
      sceneOf({ type: 'node', position: [0, 0], shape: { type: 'dynamicScenePrimitiveShape', params: {} } }),
      { shapes: [dynamicShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');

    expect(rect).toMatchObject({ type: 'rect', x: 0, y: 0, width: 10, height: 10 });
    expect(xReads).toBe(0);
  });

  it('rejects visual bounds whose derived edges become non-finite inside a discarded probe', () => {
    const farShape = defineShape({
      name: 'nonFiniteVisualBoundsShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: () => [{ type: 'rect', x: Number.MAX_VALUE, y: 0, width: Number.MAX_VALUE, height: 10, fill: '#000' }],
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'nonFiniteVisualBoundsParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nonFiniteVisualBoundsParent'),
      }),
      compile: (_, context) => {
        context.layoutChild(
          {
            type: 'node',
            position: [0, 0],
            shape: { type: 'nonFiniteVisualBoundsShape', params: {} },
            fill: '#000',
          },
          NaturalLayoutProposal,
        );
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'nonFiniteVisualBoundsParent' }), {
        composites: [parent],
        shapes: [farShape],
      }),
    ).toThrow(CompileInvariantError);
  });

  it('snapshots a dynamic Arrow marker primitive before validation and downstream use', () => {
    let xReads = 0;
    const dynamicRect = new Proxy({ type: 'rect', x: 0, y: 0, width: 10, height: 10 } as const, {
      get: (target, property, receiver) => {
        if (property === 'x') {
          xReads += 1;
          return xReads === 1 ? 0 : Number.NaN;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicArrow = defineArrow({
      name: 'dynamicMarkerPrimitiveArrow',
      lineContactX: 0,
      emit: () => [dynamicRect],
    });

    const result = compileToScene(
      sceneOf({
        type: 'path',
        marks: arrowMarks('->', { shape: 'dynamicMarkerPrimitiveArrow' }),
        children: [
          { type: 'step', kind: 'move', to: [0, 0] },
          { type: 'step', kind: 'line', to: [10, 0] },
        ],
      }),
      { arrows: [dynamicArrow] },
    );
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    const marker = path?.type === 'path' ? path.arrowEnd?.marker[0] : undefined;

    expect(marker).toMatchObject({ type: 'rect', x: 0, y: 0, width: 10, height: 10 });
    expect(xReads).toBe(0);
  });

  it('snapshots a dynamic Clip shape before validation and resource registration', () => {
    let kindReads = 0;
    const dynamicShape = new Proxy({ kind: 'rect', x: 0, y: 0, width: 10, height: 10 } as const, {
      get: (target, property, receiver) => {
        if (property === 'kind') {
          kindReads += 1;
          return kindReads === 1 ? 'rect' : 'bogus';
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicClip = defineClip({
      kind: 'dynamicClipShape',
      schema: z.strictObject({ kind: z.literal('dynamicClipShape') }),
      resolve: () => dynamicShape,
    });

    const result = compileToScene(
      sceneOf({
        type: 'scope',
        clip: { kind: 'dynamicClipShape' } as never,
        children: [{ type: 'node', position: [0, 0] }],
      }),
      { clips: [dynamicClip] },
    );
    const clip = result.scene.resources?.find(resource => resource.kind === 'clip');

    expect(clip).toMatchObject({
      kind: 'clip',
      shape: { kind: 'rect', x: 0, y: 0, width: 10, height: 10 },
    });
    expect(kindReads).toBe(0);
  });

  it('snapshots dynamic Shape sizing and offset fields before layout consumption', () => {
    let halfWidthReads = 0;
    let offsetXReads = 0;
    const circumscribed = new Proxy(
      { halfWidth: 10, halfHeight: 5 },
      {
        get: (target, property, receiver) => {
          if (property === 'halfWidth') {
            halfWidthReads += 1;
            return halfWidthReads === 1 ? 10 : Number.NaN;
          }
          return Reflect.get(target, property, receiver);
        },
      },
    );
    const offset = new Proxy([4, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          offsetXReads += 1;
          return offsetXReads === 1 ? 4 : Number.NaN;
        }
        return Reflect.get(target, property, receiver);
      },
    });
    const dynamicShape = defineShape({
      name: 'dynamicLayoutGeometryShape',
      paramsSchema: z.strictObject({}),
      circumscribe: () => circumscribed,
      circumscribeOffset: () => offset,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: BUILTIN_SHAPES.rectangle.emit,
    });

    const result = compileToScene(
      sceneOf({
        type: 'node',
        position: [0, 0],
        padding: 0,
        shape: { type: 'dynamicLayoutGeometryShape', params: {} },
      }),
      { shapes: [dynamicShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');

    expect(rect).toMatchObject({ type: 'rect', x: -6, y: -5, width: 20, height: 10 });
    expect({ halfWidthReads, offsetXReads }).toEqual({ halfWidthReads: 1, offsetXReads: 1 });
  });

  it('snapshots a dynamic provider position before finite validation and publication', () => {
    let xReads = 0;
    const position = new Proxy([10, 0] as [number, number], {
      get: (target, property, receiver) => {
        if (property === '0') {
          xReads += 1;
          return xReads === 1 ? 10 : Number.NaN;
        }
        return Reflect.get(target, property, receiver);
      },
    });

    expect(snapshotProviderPosition("Shape 'dynamicPosition' anchor", position)).toEqual([10, 0]);
    expect(xReads).toBe(1);
  });

  it('omits an allowed explicit undefined Scene field only after exact-key and metadata validation', () => {
    const shapeOf = (name: string, primitive: ScenePrimitive) =>
      defineShape({
        name,
        paramsSchema: z.strictObject({}),
        circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
        boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
        anchor: BUILTIN_SHAPES.rectangle.anchor,
        emit: () => [primitive],
      });
    const validShape = shapeOf('optionalUndefinedSceneShape', {
      type: 'rect',
      x: 0,
      y: 0,
      width: 10,
      height: 10,
      cornerRadius: undefined,
    });
    const invalidShapes = [
      shapeOf('unsupportedUndefinedSceneShape', {
        type: 'rect',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        unsupported: undefined,
      } as unknown as ScenePrimitive),
      shapeOf('metadataUndefinedSceneShape', {
        type: 'rect',
        x: 0,
        y: 0,
        width: 10,
        height: 10,
        meta: { bad: undefined },
      } as unknown as ScenePrimitive),
    ];

    const result = compileToScene(
      sceneOf({ type: 'node', position: [0, 0], shape: { type: 'optionalUndefinedSceneShape', params: {} } }),
      { shapes: [validShape] },
    );
    const rect = result.scene.primitives.find(primitive => primitive.type === 'rect');
    expect(rect).toBeDefined();
    expect(Object.hasOwn(rect as object, 'cornerRadius')).toBe(false);
    expect(Object.isFrozen(rect)).toBe(false);

    for (const shape of invalidShapes) {
      expect(() =>
        compileToScene(sceneOf({ type: 'node', position: [0, 0], shape: { type: shape.name, params: {} } }), {
          shapes: [shape],
        }),
      ).toThrow(CompositeContractError);
    }
  });

  it('rejects explicit undefined and sparse Scene or Marker arrays before primitive validation', () => {
    const lossyArrays: Array<Array<unknown>> = [[undefined], new Array(1)];
    for (const [index, children] of lossyArrays.entries()) {
      const shape = defineShape({
        name: `lossySceneArrayShape${index}`,
        paramsSchema: z.strictObject({}),
        circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
        boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
        anchor: BUILTIN_SHAPES.rectangle.anchor,
        emit: () => [{ type: 'group', children } as unknown as ScenePrimitive],
      });
      const arrow = defineArrow({
        name: `lossyMarkerArrayArrow${index}`,
        lineContactX: 0,
        emit: () => [{ type: 'group', children } as unknown as MarkerPrimitive],
      });

      expect(() =>
        compileToScene(sceneOf({ type: 'node', position: [0, 0], shape: { type: shape.name, params: {} } }), {
          shapes: [shape],
        }),
      ).toThrow(CompositeContractError);
      expect(() =>
        compileToScene(
          sceneOf({
            type: 'path',
            marks: arrowMarks('->', { shape: arrow.name }),
            children: [
              { type: 'step', kind: 'move', to: [0, 0] },
              { type: 'step', kind: 'line', to: [10, 0] },
            ],
          }),
          { arrows: [arrow] },
        ),
      ).toThrow(CompositeContractError);
    }
  });

  it('keeps a directly thrown revoked Proxy recoverable with exact selected cause identity', () => {
    const hostileThrown = Proxy.revocable({}, {});
    hostileThrown.revoke();
    const throwingShape = defineShape({
      name: 'throwingHostileProxyShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: () => {
        throw hostileThrown.proxy;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'hostileProxyFailureParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('hostileProxyFailureParent'),
        select: z.boolean(),
      }),
      compile: (value, context) => {
        const probe = context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'throwingHostileProxyShape', params: {} } },
          NaturalLayoutProposal,
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        if (value.select && probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);
        return { children: [] };
      },
    });
    const options = { composites: [parent], shapes: [throwingShape] };

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileProxyFailureParent', select: false }), options),
    ).not.toThrow();

    let selected: unknown;
    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'hostileProxyFailureParent', select: true }), options);
    } catch (cause) {
      selected = cause;
    }
    expect(isLayoutProbeRecoverableError(selected)).toBe(true);
    expect((selected as Error & { cause?: unknown }).cause).toBe(hostileThrown.proxy);
  });

  it('terminates a self-returning prototype trap on the first identity cycle', () => {
    let prototypeTrapCalls = 0;
    const selfReturningProxy: object = new Proxy(
      {},
      {
        getPrototypeOf: () => {
          prototypeTrapCalls += 1;
          if (prototypeTrapCalls > 4) throw new Error('prototype walk exceeded cycle guard threshold');
          return selfReturningProxy;
        },
      },
    );

    const normalized = normalizeLayoutProbeError(selfReturningProxy);
    expect(prototypeTrapCalls).toBe(1);
    expect(normalized.cause).toBe(selfReturningProxy);

    const throwingShape = defineShape({
      name: 'throwingSelfPrototypeProxyShape',
      paramsSchema: z.strictObject({}),
      circumscribe: BUILTIN_SHAPES.rectangle.circumscribe,
      boundaryPoint: BUILTIN_SHAPES.rectangle.boundaryPoint,
      anchor: BUILTIN_SHAPES.rectangle.anchor,
      emit: () => {
        throw selfReturningProxy;
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'selfPrototypeProxyParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('selfPrototypeProxyParent'),
        select: z.boolean(),
      }),
      compile: (value, context) => {
        const probe = context.layoutChild(
          { type: 'node', position: [0, 0], shape: { type: 'throwingSelfPrototypeProxyShape', params: {} } },
          NaturalLayoutProposal,
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        if (value.select && probe.kind === LayoutChildProbeKind.Failed) context.raise(probe.failure);
        return { children: [] };
      },
    });
    const options = { composites: [parent], shapes: [throwingShape] };

    prototypeTrapCalls = 0;
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'selfPrototypeProxyParent', select: false }), options),
    ).not.toThrow();
    expect(prototypeTrapCalls).toBe(1);

    prototypeTrapCalls = 0;
    let selected: unknown;
    try {
      compileToScene(sceneOf({ namespace: 'test', type: 'selfPrototypeProxyParent', select: true }), options);
    } catch (cause) {
      selected = cause;
    }
    expect(prototypeTrapCalls).toBe(1);
    expect(isLayoutProbeRecoverableError(selected)).toBe(true);
    expect((selected as Error & { cause?: unknown }).cause).toBe(selfReturningProxy);
  });

  it('keeps an ordinary clip provider execution throw recoverable and discardable', () => {
    const throwingClip = defineClip({
      kind: 'ordinaryThrowingClip',
      schema: z.strictObject({ kind: z.literal('ordinaryThrowingClip') }),
      resolve: () => {
        throw new Error('ordinary clip execution failure');
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'discardThrowingClip',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('discardThrowingClip'),
      }),
      compile: (_, context) => {
        const probe = context.layoutChild(
          {
            type: 'scope',
            clip: { kind: 'ordinaryThrowingClip' } as never,
            children: [{ type: 'node', position: [0, 0] }],
          },
          NaturalLayoutProposal,
        );
        expect(probe.kind).toBe(LayoutChildProbeKind.Failed);
        return { children: [] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'discardThrowingClip' }), {
        composites: [parent],
        clips: [throwingClip],
      }),
    ).not.toThrow();
  });
});

describe('layout-aware composite replay ownership', () => {
  it('publishes one duplicate-id warning and commits replay last-wins', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('duplicateReplayId'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'coordinate', id: 'same', position: [20, 0] });
        return { children: [context.replay(laid)] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { type: 'coordinate', id: 'same', position: [0, 0] },
        { namespace: 'test', type: 'duplicateReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('still reports an id introduced by raw output before replay commit', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'rawBeforeReplayId',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('rawBeforeReplayId'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'coordinate', id: 'same', position: [20, 0] });
        return {
          children: [{ type: 'coordinate', id: 'same', position: [10, 0] }, context.replay(laid)],
        };
      },
    });
    const warnings: Array<CompileWarning> = [];

    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'rawBeforeReplayId' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, -10] },
            { type: 'step', kind: 'line', to: { id: 'same' } },
          ],
        },
      ),
      {
        composites: [definition],
        onWarn: warning => warnings.push(warning),
      },
    );

    expect(warnings.filter(warning => warning.code === CompileWarningCode.DuplicateNodeId)).toHaveLength(1);
    const path = result.scene.primitives.find(primitive => primitive.type === 'path');
    expect(path?.type === 'path' ? path.commands.find(command => command.kind === 'line') : undefined).toMatchObject({
      to: [20, 0],
    });
  });

  it('preserves replay root zIndex when mixed with raw output', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'mixedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('mixedZIndex'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], zIndex: 10 });
        return {
          children: [
            context.replay(laid),
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'mixedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'rect']);
  });

  it('preserves replay root zIndex through placement transforms', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'transformedZIndex',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('transformedZIndex'),
      }),
      compile: (_, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], zIndex: 10 });
        return {
          children: [
            context.replay(laid, { transforms: [{ kind: 'translate', x: 10, y: 0 }] }),
            {
              type: 'path',
              zIndex: 5,
              children: [
                { type: 'step', kind: 'move', to: [0, 0] },
                { type: 'step', kind: 'line', to: [10, 0] },
              ],
            },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'transformedZIndex' }), {
      composites: [definition],
    });

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['path', 'group']);
  });

  it('wraps multiple replay roots independently around a sibling and deduplicates the wrapper clip', () => {
    const roots = defineComposite({
      namespace: 'test',
      type: 'multipleRoots',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('multipleRoots'),
      }),
      expand: () => ({
        children: [
          {
            type: 'path' as const,
            zIndex: 1,
            children: [
              { type: 'step' as const, kind: 'move' as const, to: [0, 0] as [number, number] },
              { type: 'step' as const, kind: 'line' as const, to: [10, 0] as [number, number] },
            ],
          },
          { type: 'node' as const, position: [0, 0] as [number, number], zIndex: 10 },
        ],
      }),
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'wrappedMultipleRoots',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('wrappedMultipleRoots'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { namespace: 'test', type: 'multipleRoots' });
        return {
          children: [
            context.replay(laid, { clip: { kind: 'rect', x: -20, y: -20, width: 40, height: 40 } }),
            { type: 'node', position: [20, 0], zIndex: 5 },
          ],
        };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'wrappedMultipleRoots' }), {
      composites: [roots, parent],
    });
    const groups = result.scene.primitives.filter(primitive => primitive.type === 'group');

    expect(result.scene.primitives.map(primitive => primitive.type)).toEqual(['group', 'rect', 'group']);
    expect(groups).toHaveLength(2);
    expect(groups[0]?.clipRef).toBe(groups[1]?.clipRef);
    expect(result.scene.resources?.filter(resource => resource.kind === 'clip')).toHaveLength(1);
  });

  it('rejects a replay token retained from a previous compile', () => {
    let retained: LayoutChildResult | undefined;
    let reuse = false;
    const definition = defineComposite({
      namespace: 'test',
      type: 'retainedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('retainedReplay'),
      }),
      compile: (_, context) => {
        if (reuse) {
          return { children: [context.replay(retained!)] };
        }
        retained = resolvedResultOf(context, { type: 'node', position: [0, 0], text: 'first' });
        return { children: [] };
      },
    });

    compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
      composites: [definition],
    });
    reuse = true;
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'retainedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('rejects a structurally forged replay token', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'forgedReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('forgedReplay'),
      }),
      compile: (_node, context) => ({
        children: [
          context.replay({
            allocationBounds: { x: 0, y: 0, width: 0, height: 0 },
            slotSize: { width: 0, height: 0 },
            visualBounds: { x: 0, y: 0, width: 0, height: 0 },
            replay: Object.freeze({}) as CompositeReplay,
          }),
        ],
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'forgedReplay' }), {
        composites: [definition],
      }),
    ).toThrow(/does not belong to this compile|forged/i);
  });

  it('rejects a copied layout result even when it retains a real replay token', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'copiedLayoutResult',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('copiedLayoutResult'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(context, { type: 'node', position: [0, 0], text: 'real' });
        return {
          children: [
            context.replay({
              ...laid,
              allocationBounds: { x: 0, y: 0, width: 999, height: 999 },
            }),
          ],
        };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'copiedLayoutResult' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.copiedLayoutResult.*children\[0\].*(invalid|forged).*layout result/i);
  });

  it('applies replay transforms to allocation, Scene, namespace, and Node artifacts', () => {
    const moved = defineComposite({
      namespace: 'test',
      type: 'moved',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('moved'),
      }),
      compile: (_, context) => {
        const child = resolvedResultOf(context, {
          type: 'node',
          id: 'moved-node',
          position: [0, 0],
          minimumSize: 10,
          padding: 0,
          margin: 0,
        });
        return {
          children: [context.replay(child, { transforms: [{ kind: 'translate', x: 20, y: 30 }] })],
        };
      },
    });
    const outer = defineComposite({
      namespace: 'test',
      type: 'outer',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('outer'),
      }),
      artifactSchema: BoundsSchema,
      compile: (_, context) => {
        const child = resolvedResultOf(context, { namespace: 'test', type: 'moved' });
        return {
          children: [context.replay(child)],
          artifact: child.allocationBounds,
        };
      },
    });
    const result = compileToScene(
      sceneOf(
        { namespace: 'test', type: 'outer' },
        {
          type: 'path',
          children: [
            { type: 'step', kind: 'move', to: [0, 0] },
            { type: 'step', kind: 'line', to: { id: 'moved-node' } },
          ],
        },
      ),
      {
        composites: [moved, outer],
        artifacts: { nodeLayouts: true },
        padding: 0,
      },
    );

    expect(result.artifacts[0]?.value).toEqual({
      x: 15,
      y: 25,
      width: 10,
      height: 10,
    });
    expect(result.artifacts).toContainEqual(
      expect.objectContaining({
        kind: 'nodeLayout',
        value: expect.objectContaining({
          id: 'moved-node',
          rect: expect.objectContaining({ x: 20, y: 30 }),
        }),
      }),
    );
    expect(result.scene.primitives.some(primitive => primitive.type === 'path')).toBe(true);
  });
});

describe('layout-aware composite artifacts and lowering errors', () => {
  it('requires exactly one expand or compile branch at runtime', () => {
    const schema = CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('invalidBranch'),
    });

    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'invalidBranch',
        schema,
        expand: () => ({ children: [] }),
        compile: () => ({ children: [] }),
      } as never),
    ).toThrow(/exactly one of expand or compile/i);
    expect(() =>
      defineComposite({
        namespace: 'test',
        type: 'invalidBranch',
        schema,
      } as never),
    ).toThrow(/exactly one of expand or compile/i);
  });

  it('rejects artifacts without a schema and schema-mismatched payloads', () => {
    const missingSchema = defineComposite({
      namespace: 'test',
      type: 'missingArtifactSchema',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('missingArtifactSchema'),
      }),
      compile: () => ({ children: [], artifact: { leaked: true } }) as never,
    });
    const mismatched = defineComposite({
      namespace: 'test',
      type: 'mismatchedArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('mismatchedArtifact'),
      }),
      artifactSchema: z.strictObject({ count: z.number() }),
      compile: () => ({
        children: [],
        artifact: { count: 'not-a-number' as unknown as number },
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'missingArtifactSchema' }), {
        composites: [missingSchema],
      }),
    ).toThrow(/artifactSchema/i);
    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'mismatchedArtifact' }), {
        composites: [mismatched],
      }),
    ).toThrow();
  });

  it('applies maxCompositeDepth to the layout-aware compile branch', () => {
    const recursive = defineComposite({
      namespace: 'test',
      type: 'recursive',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('recursive'),
      }),
      compile: (_node, context) => {
        const child = resolvedResultOf(context, { namespace: 'test', type: 'recursive' });
        return { children: [context.replay(child)] };
      },
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'recursive' }), {
        composites: [recursive],
        maxCompositeDepth: 2,
      }),
    ).toThrow(/COMPOSITE_NEST_TOO_DEEP.*children\[0\]/);
  });

  it('rejects schema-accepted values that are not JSON-safe plain data', () => {
    const unsafeSchema = z.custom<JsonValue>(() => true);
    const definition = defineComposite({
      namespace: 'test',
      type: 'unsafeArtifact',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('unsafeArtifact'),
      }),
      artifactSchema: unsafeSchema,
      compile: () => ({
        children: [],
        artifact: new Map([['hidden', true]]) as unknown as JsonValue,
      }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'unsafeArtifact' }), {
        composites: [definition],
      }),
    ).toThrow(/plain objects and arrays/i);
  });

  it('preserves JSON special keys in detached artifacts', () => {
    const payload = JSON.parse('{"__proto__":{"safe":true}}') as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'specialArtifactKeys',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('specialArtifactKeys'),
      }),
      artifactSchema: z.custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    const artifact = compileToScene(sceneOf({ namespace: 'test', type: 'specialArtifactKeys' }), {
      composites: [definition],
    }).artifacts[0];

    expect(artifact.kind).toBe('composite');
    expect(Object.hasOwn(artifact.value as object, '__proto__')).toBe(true);
    expect(JSON.stringify(artifact.value)).toBe('{"__proto__":{"safe":true}}');
  });

  it('rejects symbol-keyed artifact properties instead of silently dropping them', () => {
    const payload = { visible: true, [Symbol('hidden')]: 'not-json' } as unknown as JsonValue;
    const definition = defineComposite({
      namespace: 'test',
      type: 'symbolArtifactKey',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('symbolArtifactKey'),
      }),
      artifactSchema: z.custom<JsonValue>(),
      compile: () => ({ children: [], artifact: payload }),
    });

    expect(() =>
      compileToScene(sceneOf({ namespace: 'test', type: 'symbolArtifactKey' }), {
        composites: [definition],
      }),
    ).toThrow(/symbol key/i);
  });

  it('rejects functions, sets, class instances, symbols, and cyclic artifact data', () => {
    class ArtifactClass {
      value = true;
    }
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const values: Array<unknown> = [
      { callback: () => undefined },
      new Set(['hidden']),
      new ArtifactClass(),
      { value: Symbol('hidden') },
      cyclic,
    ];

    for (const value of values) {
      expect(() => cloneAndFreezeJson(value)).toThrow();
    }
  });

  it('rejects a layout-aware composite produced by an expand branch', () => {
    const layout = defineComposite({
      namespace: 'test',
      type: 'layoutOnly',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('layoutOnly'),
      }),
      compile: () => ({ children: [] }),
    });
    const expand = defineComposite({
      namespace: 'test',
      type: 'expandToLayout',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('expandToLayout'),
      }),
      expand: () => ({ children: [{ namespace: 'test', type: 'layoutOnly' }] }),
    });

    expect(() =>
      lowerIRToKernel(sceneOf({ namespace: 'test', type: 'expandToLayout' }), {
        composites: [expand, layout],
      }),
    ).toThrow(/test\.layoutOnly.*children\[0\].*full compile environment/i);
  });
});
