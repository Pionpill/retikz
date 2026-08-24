import type { LayoutChildResult, LayoutProposal } from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';

import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { LowerPlotsOptions } from '../../src/pipeline/expand';
import type { IRPlot } from '../../src/schemas';

import { lowerPlots } from '../../src/pipeline/expand';
import { PlotSchema } from '../../src/schemas';

const datasets: ExternalDatasets = {
  sales: [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ],
};

const plot = (): IRPlot =>
  PlotSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'sales' },
    scales: [
      { type: 'linear', name: 'xMonth' },
      { type: 'linear', name: 'yRevenue' },
    ],
    coordinate: { type: 'cartesian2D', x: 'xMonth', y: 'yRevenue' },
    marks: [{ type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
  });

const ProposalParentSchema = CompositeBaseSchema.extend({
  namespace: literal('fixture'),
  type: literal('proposal-parent'),
  child: PlotSchema,
});

const { x: naturalX, y: naturalY } = NaturalLayoutProposal;

const compileWithProposal = (
  proposal: LayoutProposal,
  child: IRPlot = plot(),
  lowerOptions: LowerPlotsOptions = {},
): LayoutChildResult => {
  const observations: Array<LayoutChildResult> = [];
  const parent = defineComposite({
    namespace: 'fixture',
    type: 'proposal-parent',
    schema: ProposalParentSchema,
    compile: (node, context) => {
      const probe = context.layoutChild(node.child, proposal);
      if (probe.kind === LayoutChildProbeKind.Failed) return context.raise(probe.failure);
      observations.push(probe.result);
      return {
        children: [context.replay(probe.result)],
        allocationBounds: probe.result.allocationBounds,
      };
    },
  });

  compileToScene(
    {
      version: 1,
      type: 'scene',
      children: [{ namespace: 'fixture', type: 'proposal-parent', child }],
    },
    {
      composites: [parent, ...lowerPlots(datasets, lowerOptions)],
      padding: 0,
    },
  );

  return observations[0];
};

describe('Plot layout proposal contract', () => {
  it('uses an exact x proposal without changing the intrinsic y fallback', () => {
    const result = compileWithProposal(
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 240 },
        y: naturalY,
      },
      PlotSchema.parse({ ...plot(), width: 640, height: 420 }),
      { width: 520, height: 360 },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 420 });
    expect(result.slotSize).toEqual({ width: 240, height: 420 });
  });

  it('uses an exact y proposal without changing the intrinsic x fallback', () => {
    const result = compileWithProposal(
      {
        x: naturalX,
        y: { kind: LayoutAxisProposalKind.Exact, value: 180 },
      },
      PlotSchema.parse({ ...plot(), width: 640, height: 420 }),
      { width: 520, height: 360 },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 640, height: 180 });
    expect(result.slotSize).toEqual({ width: 640, height: 180 });
  });

  it('uses exact proposals on both axes', () => {
    const result = compileWithProposal({
      x: { kind: LayoutAxisProposalKind.Exact, value: 320 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 160 },
    });

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 320, height: 160 });
    expect(result.slotSize).toEqual({ width: 320, height: 160 });
  });

  it('keeps node, lower option, and default dimensions for intrinsic proposals', () => {
    const result = compileWithProposal(NaturalLayoutProposal);

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 480, height: 300 });
    expect(result.slotSize).toEqual({ width: 480, height: 300 });
  });

  it('uses lower options when intrinsic node dimensions are omitted', () => {
    const result = compileWithProposal(NaturalLayoutProposal, plot(), { width: 360, height: 220 });

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 360, height: 220 });
    expect(result.slotSize).toEqual({ width: 360, height: 220 });
  });

  it('uses node dimensions before lower options for intrinsic proposals', () => {
    const result = compileWithProposal(
      NaturalLayoutProposal,
      PlotSchema.parse({ ...plot(), width: 420, height: 260 }),
      { width: 360, height: 220 },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 420, height: 260 });
    expect(result.slotSize).toEqual({ width: 420, height: 260 });
  });

  it('clamps intrinsic dimensions to a range before lowering geometry', () => {
    const result = compileWithProposal({
      x: { kind: LayoutAxisProposalKind.Range, min: 120, max: 240 },
      y: { kind: LayoutAxisProposalKind.Range, min: 100, max: 180 },
    });

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 180 });
    expect(result.slotSize).toEqual({ width: 240, height: 180 });
  });

  it.each([
    ['width', { x: { kind: LayoutAxisProposalKind.Exact, value: 0 }, y: naturalY }],
    ['height', { x: naturalX, y: { kind: LayoutAxisProposalKind.Exact, value: 0 } }],
  ] as const)('fails loudly for a non-positive exact %s allocation', (_axis, proposal) => {
    expect(() => compileWithProposal(proposal)).toThrow(/must be a positive finite number/);
  });
});
