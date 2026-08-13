import type { IRChild, LayoutChildResult, LayoutProposal } from '@retikz/core';

import {
  ChildSchema,
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import type { SurfaceInput } from '../../../src';

import { createSurface, SurfaceDefinition } from '../../../src';

type ProbeLog = Readonly<{ id: string; proposal: LayoutProposal }>;

const LeafSchema = CompositeBaseSchema.extend({
  namespace: z.literal('surface-test'),
  type: z.literal('leaf'),
  id: z.string(),
  width: z.number().nonnegative(),
  height: z.number().nonnegative(),
  originX: z.number().default(0),
  originY: z.number().default(0),
  reject: z.boolean().default(false),
});

const createLeafDefinition = (logs: Array<ProbeLog>) =>
  defineComposite({
    namespace: 'surface-test',
    type: 'leaf',
    schema: LeafSchema,
    compile: (node, context) => {
      logs.push({ id: node.id, proposal: context.proposal });
      if (node.reject) throw new Error(`Leaf '${node.id}' rejected its proposal`);
      return {
        allocationBounds: {
          x: node.originX,
          y: node.originY,
          width: node.width,
          height: node.height,
        },
        children: [
          context.scope(
            { id: node.id },
            [],
            [
              {
                key: 'leaf',
                role: 'leaf',
                bounds: {
                  x: node.originX,
                  y: node.originY,
                  width: node.width,
                  height: node.height,
                },
              },
            ],
          ),
        ],
      };
    },
  });

const leaf = (overrides: Record<string, unknown> = {}): IRChild => ({
  namespace: 'surface-test',
  type: 'leaf',
  id: 'content',
  width: 20,
  height: 10,
  ...overrides,
});

const naturalProposal = (): LayoutProposal => ({
  x: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
  y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
});

const compileSurface = (
  child: IRChild,
  proposal: LayoutProposal = naturalProposal(),
  padding: SurfaceInput['padding'] = 0,
  appearance: Pick<SurfaceInput, 'background' | 'border' | 'cornerRadius' | 'overflow'> = {},
) => {
  const logs: Array<ProbeLog> = [];
  let observed: LayoutChildResult | undefined;
  const harness = defineComposite({
    namespace: 'surface-test',
    type: 'harness',
    schema: CompositeBaseSchema.extend({
      namespace: z.literal('surface-test'),
      type: z.literal('harness'),
      child: ChildSchema,
    }),
    compile: (node, context) => {
      const result = context.layoutChild(node.child, proposal);
      if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
      observed = result.result;
      return { children: [context.replay(result.result)] };
    },
  });
  const surface = createSurface({
    namespace: 'standard',
    type: 'surface',
    child,
    padding,
    ...appearance,
  });
  const output = compileToScene(
    {
      type: 'scene',
      version: 1,
      children: [{ namespace: 'surface-test', type: 'harness', child: surface }],
    },
    { composites: [SurfaceDefinition, createLeafDefinition(logs), harness], padding: 0 },
  );
  if (observed === undefined) throw new Error('Expected Surface probe to resolve');
  return { logs, observed, output };
};

describe('Surface layout compile', () => {
  it('adds padding to intrinsic slot and aligns a non-zero child allocation origin', () => {
    const result = compileSurface(leaf({ originX: -5, originY: 3 }), naturalProposal(), {
      top: 2,
      right: 5,
      bottom: 4,
      left: 3,
    });

    expect(result.logs).toEqual([{ id: 'content', proposal: naturalProposal() }]);
    expect(result.observed.slotSize).toEqual({ width: 28, height: 16 });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 28, height: 16 });
    expect(result.output.spatialHandles.entries.find(entry => entry.role === 'leaf')?.geometry.bounds).toEqual({
      x: 3,
      y: 2,
      width: 20,
      height: 10,
    });
  });

  it('subtracts padding from range proposals and clamps child minimum at zero', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Range, min: 30, max: 40 },
      y: { kind: LayoutAxisProposalKind.Range, min: 4 },
    };
    const result = compileSurface(leaf(), proposal, { top: 3, right: 5, bottom: 3, left: 3 });

    expect(result.logs[0]?.proposal).toEqual({
      x: { kind: LayoutAxisProposalKind.Range, min: 22, max: 32 },
      y: { kind: LayoutAxisProposalKind.Range, min: 0 },
    });
    expect(result.observed.slotSize).toEqual({ width: 30, height: 16 });
  });

  it('subtracts padding from exact proposals while preserving the parent fixed slot', () => {
    const proposal: LayoutProposal = {
      x: { kind: LayoutAxisProposalKind.Exact, value: 50 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 30 },
    };
    const result = compileSurface(leaf(), proposal, { top: 3, right: 5, bottom: 3, left: 3 });

    expect(result.logs[0]?.proposal).toEqual({
      x: { kind: LayoutAxisProposalKind.Exact, value: 42 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 24 },
    });
    expect(result.observed.slotSize).toEqual({ width: 50, height: 30 });
    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 50, height: 30 });
  });

  it.each([
    {
      label: 'finite range',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Range, min: 0, max: 7 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      } satisfies LayoutProposal,
    },
    {
      label: 'exact',
      proposal: {
        x: { kind: LayoutAxisProposalKind.Exact, value: 7 },
        y: { kind: LayoutAxisProposalKind.Intrinsic, mode: 'natural' },
      } satisfies LayoutProposal,
    },
  ])('fails $label proposals smaller than horizontal padding before probing the child', ({ proposal }) => {
    const logs: Array<ProbeLog> = [];
    const harness = defineComposite({
      namespace: 'surface-test',
      type: 'failure-harness',
      schema: CompositeBaseSchema.extend({
        namespace: z.literal('surface-test'),
        type: z.literal('failure-harness'),
        child: ChildSchema,
      }),
      compile: (node, context) => {
        const result = context.layoutChild(node.child, proposal);
        if (result.kind === LayoutChildProbeKind.Failed) return context.raise(result.failure);
        return { children: [context.replay(result.result)] };
      },
    });
    const surface = createSurface({
      namespace: 'standard',
      type: 'surface',
      child: leaf(),
      padding: { left: 3, right: 5 },
    });

    expect(() =>
      compileToScene(
        {
          type: 'scene',
          version: 1,
          children: [{ namespace: 'surface-test', type: 'failure-harness', child: surface }],
        },
        { composites: [SurfaceDefinition, createLeafDefinition(logs), harness] },
      ),
    ).toThrow(/surface.*x.*padding/i);
    expect(logs).toEqual([]);
  });

  it('propagates child probe failure without substituting intrinsic layout', () => {
    expect(() => compileSurface(leaf({ reject: true }))).toThrow(/Leaf 'content' rejected/);
  });

  it('keeps allocation at the border box while reporting border stroke as visual overflow', () => {
    const result = compileSurface(leaf(), naturalProposal(), 2, {
      border: { stroke: '#0f172a', strokeWidth: 6 },
    });

    expect(result.observed.allocationBounds).toEqual({ x: 0, y: 0, width: 24, height: 14 });
    expect(result.observed.visualBounds).toEqual({ x: -30, y: -30, width: 84, height: 74 });
  });
});
