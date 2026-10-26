import type { LayoutChildResult, LayoutProposal } from '@retikz/core';
import {
  compileToScene,
  CompositeBaseSchema,
  defineComposite,
  LayoutAxisProposalKind,
  LayoutChildProbeKind,
  NaturalLayoutProposal,
} from '@retikz/core';
import type { ExternalDatasets } from '@retikz/data';
import { describe, expect, it } from 'vitest';
import { literal } from 'zod';

import type { LowerPlotsOptions } from '../../src/pipeline/expand';
import { lowerPlots } from '../../src/pipeline/expand';
import type { IRPlot } from '../../src/schemas';
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
    marks: [{ type: 'point', encodings: { position: { x: { field: 'month' }, y: { field: 'revenue' } } } }],
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

describe('Plot 布局建议契约', () => {
  it('使用精确的 x 建议，而不更改内在的 y 回退', () => {
    const result = compileWithProposal(
      {
        x: { kind: LayoutAxisProposalKind.Exact, value: 240 },
        y: naturalY,
      },
      PlotSchema.parse({ ...plot(), width: 640, height: 420 }),
      { layout: { width: 520, height: 360 } },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 240, height: 420 });
    expect(result.slotSize).toEqual({ width: 240, height: 420 });
  });

  it('使用精确的 y 建议，而不更改内在的 x 回退', () => {
    const result = compileWithProposal(
      {
        x: naturalX,
        y: { kind: LayoutAxisProposalKind.Exact, value: 180 },
      },
      PlotSchema.parse({ ...plot(), width: 640, height: 420 }),
      { layout: { width: 520, height: 360 } },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 640, height: 180 });
    expect(result.slotSize).toEqual({ width: 640, height: 180 });
  });

  it('在两个轴上使用精确建议', () => {
    const result = compileWithProposal({
      x: { kind: LayoutAxisProposalKind.Exact, value: 320 },
      y: { kind: LayoutAxisProposalKind.Exact, value: 160 },
    });

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 320, height: 160 });
    expect(result.slotSize).toEqual({ width: 320, height: 160 });
  });

  it('保留节点、下沉选项和内在提案的默认维度', () => {
    const result = compileWithProposal(NaturalLayoutProposal);

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 480, height: 300 });
    expect(result.slotSize).toEqual({ width: 480, height: 300 });
  });

  it('当省略固有节点尺寸时，使用下沉的选项', () => {
    const result = compileWithProposal(NaturalLayoutProposal, plot(), { layout: { width: 360, height: 220 } });

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 360, height: 220 });
    expect(result.slotSize).toEqual({ width: 360, height: 220 });
  });

  it('在内部提案的下沉选项之前使用节点维度', () => {
    const result = compileWithProposal(
      NaturalLayoutProposal,
      PlotSchema.parse({ ...plot(), width: 420, height: 260 }),
      { layout: { width: 360, height: 220 } },
    );

    expect(result.allocationBounds).toEqual({ x: 0, y: 0, width: 420, height: 260 });
    expect(result.slotSize).toEqual({ width: 420, height: 260 });
  });

  it('在下沉几何形状之前将固有尺寸限制在一定范围内', () => {
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
  ] as const)('对于非正的精确 %s 分配，明确报错', (_axis, proposal) => {
    expect(() => compileWithProposal(proposal)).toThrow(/must be a positive finite number/);
  });
});
