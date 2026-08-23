import { describe, expect, it, vi } from 'vitest';
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
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  LayoutIntrinsicMode,
  lowerIRToKernel,
  NaturalLayoutProposal,
} from '../../src';

const fixedMeasurer: TextMeasurer = text => ({
  width: text.length * 10,
  height: 10,
  ascent: 8,
  descent: 2,
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

const createLayoutDefinition = () =>
  defineComposite({
    namespace: 'test',
    type: 'layout',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('test'),
      type: z.literal('layout'),
      child: ChildSchema,
      width: z.number().nonnegative(),
    }),
    artifactSchema: z.strictObject({
      naturalWidth: z.number(),
      rangeWidth: z.number(),
    }),
    compile: (node, context) => {
      expect(context.proposal).toEqual(NaturalLayoutProposal);
      expect(Object.isFrozen(context.proposal)).toBe(true);
      expect(Object.isFrozen(context.proposal.x)).toBe(true);
      expect(Object.isFrozen(context.proposal.y)).toBe(true);
      const naturalProbe = context.layoutChild(node.child, NaturalLayoutProposal);
      expect(naturalProbe.kind).toBe(LayoutChildProbeKind.Resolved);
      if (naturalProbe.kind === LayoutChildProbeKind.Failed) return context.raise(naturalProbe.failure);
      const ranged = resolvedResultOf(context, node.child, {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: node.width },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
      });
      return {
        children: [context.replay(ranged)],
        artifact: {
          naturalWidth: naturalProbe.result.allocationBounds.width,
          rangeWidth: ranged.allocationBounds.width,
        },
      };
    },
  });

const sceneOf = (child: IRChild): IRScene => ({
  version: 1,
  type: 'scene',
  children: [child],
});

describe('layout-aware composite', () => {
  it('routes a composite warning through onWarn with the current Source locator', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'warning',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('warning'),
      }),
      compile: (_node, context) => {
        context.warn('TEST_COMPOSITE_WARNING', 'Composite warning', 'recipe.marks[0].override');
        return { children: [] };
      },
    });
    const warnings: Array<CompileWarning> = [];

    compileToScene(sceneOf({ namespace: 'test', type: 'warning' }), {
      composites: [definition],
      onWarn: warning => warnings.push(warning),
    });

    expect(warnings).toEqual([
      expect.objectContaining({
        code: 'TEST_COMPOSITE_WARNING',
        message: 'Composite warning',
        path: 'children[0].recipe.marks[0].override',
      }),
    ]);
  });

  it('keeps nested composite warnings transactional until the selected probe is replayed', () => {
    const child = defineComposite({
      namespace: 'test',
      type: 'warningChild',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('warningChild'),
      }),
      compile: (_node, context) => {
        context.warn('TEST_PROBE_WARNING', 'Probe warning');
        return { children: [] };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'warningParent',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('warningParent'),
        replay: z.boolean(),
      }),
      compile: (node, context) => {
        const probe = context.layoutChild({ namespace: 'test', type: 'warningChild' }, NaturalLayoutProposal);
        if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
        return { children: node.replay ? [context.replay(probe.result)] : [] };
      },
    });
    const discardedWarnings: Array<CompileWarning> = [];
    const replayedWarnings: Array<CompileWarning> = [];

    compileToScene(sceneOf({ namespace: 'test', type: 'warningParent', replay: false }), {
      composites: [child, parent],
      onWarn: warning => discardedWarnings.push(warning),
    });
    compileToScene(sceneOf({ namespace: 'test', type: 'warningParent', replay: true }), {
      composites: [child, parent],
      onWarn: warning => replayedWarnings.push(warning),
    });

    expect(discardedWarnings).toEqual([]);
    expect(replayedWarnings).toEqual([
      expect.objectContaining({ code: 'TEST_PROBE_WARNING', message: 'Probe warning' }),
    ]);
  });

  it('measures intrinsic and constrained content, then replays the selected result without a third layout', () => {
    const measureText = vi.fn<TextMeasurer>(fixedMeasurer);
    const definition = createLayoutDefinition();
    const result = compileToScene(
      sceneOf({
        namespace: 'test',
        type: 'layout',
        width: 45,
        child: {
          type: 'node',
          position: [0, 0],
          text: 'aa aa',
          padding: 0,
          margin: 0,
          fill: 'transparent',
          stroke: 'transparent',
        },
      }),
      { composites: [definition], measureText, padding: 0 },
    );

    expect(result.scene.primitives).not.toHaveLength(0);
    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'layout',
        occurrence: { sourcePath: 'children[0]', expansionPath: [] },
        value: { naturalWidth: 50, rangeWidth: 20 },
      },
    ]);
    expect(measureText).toHaveBeenCalledTimes(4);
  });

  it('does not broadcast a range Scope proposal to nested layout-aware composites', () => {
    const nested = defineComposite({
      namespace: 'test',
      type: 'nestedConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('nestedConstraint'),
      }),
      artifactSchema: z.strictObject({
        xMode: z.literal('natural'),
        yMode: z.literal('natural'),
      }),
      compile: (_node, { proposal }) => {
        if (
          proposal.x.kind !== LayoutAxisProposalKind.Intrinsic ||
          proposal.x.mode !== LayoutIntrinsicMode.Natural ||
          proposal.y.kind !== LayoutAxisProposalKind.Intrinsic ||
          proposal.y.mode !== LayoutIntrinsicMode.Natural
        ) {
          throw new Error('Expected natural proposal inside structural Scope');
        }
        return {
          children: [],
          artifact: { xMode: proposal.x.mode, yMode: proposal.y.mode },
        };
      },
    });
    const parent = defineComposite({
      namespace: 'test',
      type: 'scopeConstraint',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('scopeConstraint'),
      }),
      compile: (_node, context) => {
        const laid = resolvedResultOf(
          context,
          {
            type: 'scope',
            children: [{ namespace: 'test', type: 'nestedConstraint' }],
          },
          {
            x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 40 },
            y: { kind: LayoutAxisProposalKind.Intrinsic, mode: LayoutIntrinsicMode.Natural },
          },
        );
        return { children: [context.replay(laid)] };
      },
    });

    const result = compileToScene(sceneOf({ namespace: 'test', type: 'scopeConstraint' }), {
      composites: [parent, nested],
    });

    expect(result.artifacts).toEqual([
      {
        kind: 'composite',
        namespace: 'test',
        type: 'nestedConstraint',
        occurrence: {
          sourcePath: 'children[0]',
          expansionPath: [
            { kind: 'replay', index: 0 },
            { kind: 'scopeChild', index: 0 },
          ],
        },
        value: { xMode: 'natural', yMode: 'natural' },
      },
    ]);
  });

  it('rejects duplicate replay placement', () => {
    const definition = defineComposite({
      namespace: 'test',
      type: 'duplicateReplay',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('duplicateReplay'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const laid = resolvedResultOf(context, node.child);
        return {
          children: [context.replay(laid), context.replay(laid)],
        };
      },
    });

    expect(() =>
      compileToScene(
        sceneOf({
          namespace: 'test',
          type: 'duplicateReplay',
          child: { type: 'node', position: [0, 0], text: 'A' },
        }),
        { composites: [definition] },
      ),
    ).toThrow(/Composite 'test\.duplicateReplay' at children\[0\].*already replayed/i);
  });

  it('makes lowerIRToKernel fail loudly before invoking a layout-aware definition', () => {
    const compile = vi.fn(() => ({ children: [] }));
    const definition = defineComposite({
      namespace: 'test',
      type: 'layoutOnly',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('test'),
        type: z.literal('layoutOnly'),
      }),
      compile,
    });

    expect(() =>
      lowerIRToKernel(sceneOf({ namespace: 'test', type: 'layoutOnly' }), {
        composites: [definition],
      }),
    ).toThrow(/test\.layoutOnly.*children\[0\].*full compile environment/i);
    expect(compile).not.toHaveBeenCalled();
  });
});
