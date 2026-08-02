import type { IRPlotSpec } from '@retikz/plot';

import { describe, expect, it } from 'vitest';

import type { ChartRecipeInvariantError, ChartRecipeStyleContext } from '../../src/providers';

import { ChartRecipeInvariantReason, ScatterChartRecipe } from '../../src/providers';
import { ScatterChartSpecSchema } from '../../src/schemas';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const scatter = (overrides: Record<string, unknown> = {}) =>
  ScatterChartSpecSchema.parse({
    namespace: 'chart',
    type: 'scatter',
    id: 'sales',
    data: { reference: 'rows' },
    encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    ...overrides,
  });

describe('Scatter Chart recipe', () => {
  it('builds the exact primary Point, spatial root, scales and axis defaults', () => {
    const seed = ScatterChartRecipe.createSeed(scatter(), visibleStyle);

    expect(seed.plot).toEqual({
      namespace: 'plot',
      type: 'plot',
      id: 'sales/plot',
      data: { reference: 'rows' },
      scales: [
        { type: 'linear', name: '__chart.scatter.scale.x' },
        { type: 'linear', name: '__chart.scatter.scale.y' },
      ],
      coordinate: {
        type: 'cartesian2D',
        x: '__chart.scatter.scale.x',
        y: '__chart.scatter.scale.y',
      },
      marks: [
        {
          type: 'point',
          id: '__chart.scatter.mark.main',
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
      guides: [
        { type: 'axis', id: '__chart.scatter.guide.x', dimension: 'x' },
        { type: 'axis', id: '__chart.scatter.guide.y', dimension: 'y', grid: true },
      ],
    });
    expect(seed.members.map(member => member.target)).toEqual([
      'scale.x',
      'scale.y',
      'coordinate.main',
      'mark.main',
      'guide.x',
      'guide.y',
    ]);
    expect(seed.patches).toEqual([]);
  });

  it('normalizes visual channels and creates a bound size legend only for field size', () => {
    const fieldSeed = ScatterChartRecipe.createSeed(
      scatter({
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
          color: { field: 'group', scale: 'colorScale' },
          size: { field: 'weight' },
          opacity: { value: 0.7 },
          shape: { field: 'kind' },
        },
      }),
      visibleStyle,
    );

    expect(fieldSeed.plot.marks[0]).toMatchObject({
      color: { kind: 'field', value: 'group', scale: 'colorScale' },
      size: { kind: 'field', value: 'weight' },
      opacity: { kind: 'constant', value: 0.7 },
      shape: { kind: 'field', value: 'kind' },
    });
    expect(fieldSeed.plot.guides).toContainEqual({
      type: 'legend',
      channel: 'size',
      scale: '__size_weight',
    });

    const constantSeed = ScatterChartRecipe.createSeed(
      scatter({
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
          color: { value: '#2563eb' },
          size: { value: 6 },
        },
      }),
      visibleStyle,
    );
    expect(constantSeed.plot.marks[0]).toMatchObject({
      color: { kind: 'constant', value: '#2563eb' },
      size: { kind: 'constant', value: 6 },
    });
    expect(constantSeed.plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
  });

  it('applies the authored Point patch after recipe visual channels', () => {
    const seed = ScatterChartRecipe.createSeed(
      scatter({
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
          color: { value: '#2563eb' },
        },
        mark: {
          color: { kind: 'constant', value: '#dc2626' },
          strokeWidth: { kind: 'constant', value: 2 },
          layer: { zIndex: 5 },
        },
      }),
      visibleStyle,
    );

    expect(seed.patches).toEqual([
      {
        target: 'mark.main',
        inputPath: ['mark'],
        sourcePath: '$spec/mark',
        changes: [
          { path: ['color'], value: { kind: 'constant', value: '#dc2626' } },
          { path: ['strokeWidth'], value: { kind: 'constant', value: 2 } },
          { path: ['layer'], value: { zIndex: 5 } },
        ],
      },
    ]);
  });

  it('uses presentation style only for optional guide topology', () => {
    const seed = ScatterChartRecipe.createSeed(
      scatter({ encoding: { x: { field: 'amount' }, y: { field: 'margin' }, size: { field: 'weight' } } }),
      { axisEnabled: false, axisGridEnabled: false, legendEnabled: false, seriesColor: '#475569' },
    );

    expect(seed.plot.guides).toEqual([]);
    expect(seed.members.filter(member => member.kind === 'guide')).toEqual([]);
  });

  it.each([
    {
      reason: ChartRecipeInvariantReason.RequiredScale,
      path: ['scales'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, scales: plot.scales.slice(1) }),
    },
    {
      reason: ChartRecipeInvariantReason.SpatialRoot,
      path: ['coordinate'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, coordinate: { type: 'cartesian1D' } }),
    },
    {
      reason: ChartRecipeInvariantReason.CoreMark,
      path: ['marks'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, marks: [] }),
    },
  ])('rejects a broken $reason invariant', ({ reason, path, mutate }) => {
    const spec = scatter();
    const plot = mutate(ScatterChartRecipe.createSeed(spec, visibleStyle).plot);

    expect(() => ScatterChartRecipe.validateCore(spec, plot)).toThrowError(
      expect.objectContaining<Partial<ChartRecipeInvariantError>>({ reason, path }),
    );
  });
});
