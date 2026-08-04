import type { IRPlotSpec } from '@retikz/plot';

import { describe, expect, it } from 'vitest';

import type { ChartRecipeInvariantError, ChartRecipeStyleContext } from '../../../src/families/shared';

import { ChartRecipeInvariantReason } from '../../../src/families/shared';
import { InfrastructureChartRecipe, InfrastructureChartSpecSchema } from '../../../src/internal/fixture';
import { ChartType } from '../../../src/schemas/constants';

const input = {
  namespace: 'chart',
  type: '__infrastructure-fixture',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: 'amount', y: 'margin' },
  mark: {
    size: { kind: 'constant', value: 4 },
    opacity: { kind: 'constant', value: 0.5 },
  },
  components: [{ target: 'guide.x', grid: true }],
  theme: { background: '#ffffff' },
  layout: { autoPadding: true },
  width: 480,
  height: 300,
  meta: { source: 'test' },
} as const;

const neutralStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

describe('Infrastructure Chart recipe', () => {
  it('生成精确的 pre-merge Plot seed、七个 member 与 grouped patches', () => {
    const spec = InfrastructureChartSpecSchema.parse(input);
    const seed = InfrastructureChartRecipe.createSeed(spec, neutralStyle);

    expect(ChartType.InfrastructureFixture).toBe('__infrastructure-fixture');
    expect(seed.plot).toEqual({
      namespace: 'plot',
      type: 'plot',
      id: 'sales/plot',
      data: { reference: 'rows' },
      transform: [{ kind: 'sort', field: 'amount', order: 'ascending' }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'point',
          id: '__chart.__infrastructure-fixture.mark.main',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
      guides: [
        {
          type: 'axis',
          id: '__chart.__infrastructure-fixture.guide.x',
          dimension: 'x',
        },
        {
          type: 'axis',
          id: '__chart.__infrastructure-fixture.guide.y',
          dimension: 'y',
          grid: true,
        },
      ],
      layout: { autoPadding: true },
      width: 480,
      height: 300,
      meta: { source: 'test' },
    });
    expect(seed.members).toEqual([
      {
        target: 'transform.order-x',
        kind: 'transform',
        core: true,
        value: { kind: 'sort', field: 'amount', order: 'ascending' },
        plotPath: ['transform', 0],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/transform.order-x',
      },
      {
        target: 'scale.x',
        kind: 'scale',
        core: true,
        value: { type: 'linear', name: 'x' },
        plotPath: ['scales', 0],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/scale.x',
      },
      {
        target: 'scale.y',
        kind: 'scale',
        core: true,
        value: { type: 'linear', name: 'y' },
        plotPath: ['scales', 1],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/scale.y',
      },
      {
        target: 'coordinate.main',
        kind: 'coordinate',
        core: true,
        value: { type: 'cartesian2D', x: 'x', y: 'y' },
        plotPath: ['coordinate'],
        patchablePaths: [],
        sourcePath: '$recipe/__infrastructure-fixture/coordinate.main',
      },
      {
        target: 'mark.main',
        kind: 'mark',
        core: true,
        value: {
          type: 'point',
          id: '__chart.__infrastructure-fixture.mark.main',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
        plotPath: ['marks', 0],
        patchablePaths: [['size'], ['opacity']],
        sourcePath: '$recipe/__infrastructure-fixture/mark.main',
      },
      {
        target: 'guide.x',
        kind: 'guide',
        core: false,
        value: {
          type: 'axis',
          id: '__chart.__infrastructure-fixture.guide.x',
          dimension: 'x',
        },
        plotPath: ['guides', 0],
        patchablePaths: [['grid']],
        sourcePath: '$recipe/__infrastructure-fixture/guide.x',
      },
      {
        target: 'guide.y',
        kind: 'guide',
        core: false,
        value: {
          type: 'axis',
          id: '__chart.__infrastructure-fixture.guide.y',
          dimension: 'y',
          grid: true,
        },
        plotPath: ['guides', 1],
        patchablePaths: [['grid']],
        sourcePath: '$recipe/__infrastructure-fixture/guide.y',
      },
    ]);
    expect(seed.patches).toEqual([
      {
        target: 'mark.main',
        inputPath: ['mark'],
        sourcePath: '$spec/mark',
        changes: [
          { path: ['size'], value: { kind: 'constant', value: 4 } },
          { path: ['opacity'], value: { kind: 'constant', value: 0.5 } },
        ],
      },
      {
        target: 'guide.x',
        inputPath: ['components', 0],
        sourcePath: '$spec/components/0',
        changes: [{ path: ['grid'], value: true }],
      },
    ]);
  });

  it('省略 id 和 patch 时不生成对应字段或 patch group', () => {
    const spec = InfrastructureChartSpecSchema.parse({
      namespace: 'chart',
      type: ChartType.InfrastructureFixture,
      data: { reference: 'rows' },
      encoding: { x: 'amount', y: 'margin' },
    });
    const seed = InfrastructureChartRecipe.createSeed(spec, neutralStyle);

    expect(seed.plot).not.toHaveProperty('id');
    expect(seed.patches).toEqual([]);
  });

  it('用 strict patch schema 和共享空间根 refinement 拒绝非法输入', () => {
    expect(() => InfrastructureChartSpecSchema.parse({ ...input, mark: {} })).toThrow(
      'infrastructure mark patch requires size or opacity',
    );
    expect(() => InfrastructureChartSpecSchema.parse({ ...input, mark: { unknown: true } })).toThrow();
    const result = InfrastructureChartSpecSchema.safeParse({
      ...input,
      coordinate: { type: 'cartesian2D' },
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });

    expect(result.success).toBe(false);
    if (result.success) return;
    expect(result.error.issues[0]).toMatchObject({
      path: ['composition'],
      message: 'Chart spec cannot use coordinate and composition together',
    });
  });

  it('让最终 private variant 接受合法的 owner composition 字段', () => {
    const result = InfrastructureChartSpecSchema.parse({
      ...input,
      composition: {
        defaultView: 'main',
        views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
      },
    });

    expect(result.composition).toEqual({
      defaultView: 'main',
      views: [{ id: 'main', coordinate: { type: 'cartesian2D' } }],
    });
  });

  it.each([
    {
      reason: ChartRecipeInvariantReason.RequiredTransform,
      path: ['transform'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, transform: [] }),
    },
    {
      reason: ChartRecipeInvariantReason.RequiredScale,
      path: ['scales'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, scales: plot.scales.filter(scale => scale.name !== 'x') }),
    },
    {
      reason: ChartRecipeInvariantReason.SpatialRoot,
      path: ['coordinate'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, coordinate: { type: 'polar2D' } }),
    },
    {
      reason: ChartRecipeInvariantReason.CoreMark,
      path: ['marks'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, marks: [{ type: 'point', encoding: {} }] }),
    },
  ])('用 typed invariant 报告 $reason', ({ reason, path, mutate }) => {
    const spec = InfrastructureChartSpecSchema.parse(input);
    const plot = mutate(InfrastructureChartRecipe.createSeed(spec, neutralStyle).plot);

    expect(() => InfrastructureChartRecipe.validateCore(spec, plot)).toThrowError(
      expect.objectContaining<Partial<ChartRecipeInvariantError>>({ reason, path }),
    );
  });
});
