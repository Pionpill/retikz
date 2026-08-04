import type { IRPlotSpec } from '@retikz/plot';

import { describe, expect, it } from 'vitest';

import type { ChartRecipeInvariantError, ChartRecipeStyleContext } from '../../../src/families/shared';

import { BubbleChartRecipe, BubbleChartSpecSchema } from '../../../src/families/scatter-points/bubble';
import { ChartRecipeInvariantReason } from '../../../src/families/shared';
import { BUILTIN_CHART_RECIPES } from '../../../src/resolution/catalog';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const bubble = (overrides: Record<string, unknown> = {}) =>
  BubbleChartSpecSchema.parse({
    namespace: 'chart',
    type: 'bubble',
    id: 'sales',
    data: { reference: 'rows' },
    encoding: { x: { field: 'amount' }, y: { field: 'margin' }, size: { field: 'volume' } },
    ...overrides,
  });

describe('Bubble Chart recipe', () => {
  it('registers Bubble as a closed peer between Scatter and Connected Scatter', () => {
    expect(BUILTIN_CHART_RECIPES.map(recipe => recipe.type)).toEqual([
      '__infrastructure-fixture',
      'scatter',
      'bubble',
      'connected-scatter',
    ]);
  });

  it('builds an independent Point recipe with an implicit descriptor-owned size guide', () => {
    const seed = BubbleChartRecipe.createSeed(bubble(), visibleStyle);

    expect(seed.plot).toEqual({
      namespace: 'plot',
      type: 'plot',
      id: 'sales/plot',
      data: { reference: 'rows' },
      scales: [
        { type: 'linear', name: '__chart.bubble.scale.x' },
        { type: 'linear', name: '__chart.bubble.scale.y' },
      ],
      coordinate: {
        type: 'cartesian2D',
        x: '__chart.bubble.scale.x',
        y: '__chart.bubble.scale.y',
      },
      marks: [
        {
          type: 'point',
          id: '__chart.bubble.mark.main',
          size: { kind: 'field', value: 'volume' },
          encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
        },
      ],
      guides: [
        { type: 'axis', id: '__chart.bubble.guide.x', dimension: 'x' },
        { type: 'axis', id: '__chart.bubble.guide.y', dimension: 'y', grid: true },
        { type: 'legend', channel: 'size' },
      ],
    });
    expect(seed.members.map(member => member.target)).toEqual([
      'scale.x',
      'scale.y',
      'coordinate.main',
      'mark.main',
      'guide.x',
      'guide.y',
      'guide.size',
    ]);
    expect(seed.members.every(member => member.sourcePath.startsWith('$recipe/bubble/'))).toBe(true);
  });

  it('uses an authored sqrt scale identity and respects optional guide topology', () => {
    const explicit = BubbleChartRecipe.createSeed(
      bubble({
        encoding: {
          x: { field: 'amount' },
          y: { field: 'margin' },
          size: { field: 'volume', scale: 'volume-radius' },
        },
        scales: [{ type: 'sqrt', name: 'volume-radius', domain: [0, 100] }],
      }),
      visibleStyle,
    );
    expect(explicit.plot.guides).toContainEqual({ type: 'legend', channel: 'size', scale: 'volume-radius' });

    const hidden = BubbleChartRecipe.createSeed(bubble(), { ...visibleStyle, legendEnabled: false });
    expect(hidden.plot.guides?.some(guide => guide.type === 'legend')).toBe(false);
  });

  it('keeps datum labels and compatible Point patches outside the core size role', () => {
    const seed = BubbleChartRecipe.createSeed(
      bubble({
        mark: {
          label: { content: { field: 'name' } },
          opacity: { kind: 'constant', value: 0.7 },
          encoding: { depth: { field: 'depth' } },
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
          { path: ['opacity'], value: { kind: 'constant', value: 0.7 } },
          { path: ['label'], value: { content: { field: 'name' } } },
          { path: ['encoding', 'depth'], value: { field: 'depth' } },
        ],
      },
    ]);
  });

  it('treats explicit undefined reserved and optional encoding patches as omitted values', () => {
    const seed = BubbleChartRecipe.createSeed(
      bubble({ mark: { encoding: { text: undefined, size: undefined } } }),
      visibleStyle,
    );

    expect(seed.patches).toEqual([]);
    expect(seed.plot.marks[0]).toMatchObject({ size: { kind: 'field', value: 'volume' } });
  });

  it.each([
    {
      reason: ChartRecipeInvariantReason.RequiredScale,
      path: ['scales'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, scales: plot.scales.slice(1) }),
    },
    {
      reason: ChartRecipeInvariantReason.CoreMark,
      path: ['marks'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({ ...plot, marks: [] }),
    },
    {
      reason: ChartRecipeInvariantReason.CoreMark,
      path: ['marks'],
      mutate: (plot: IRPlotSpec): IRPlotSpec => ({
        ...plot,
        marks: [{ ...plot.marks[0], size: { kind: 'constant', value: 8 } }],
      }),
    },
  ])('rejects a broken $reason invariant', ({ reason, path, mutate }) => {
    const spec = bubble();
    const plot = mutate(BubbleChartRecipe.createSeed(spec, visibleStyle).plot);

    expect(() => BubbleChartRecipe.validateCore(spec, plot)).toThrowError(
      expect.objectContaining<Partial<ChartRecipeInvariantError>>({ reason, path }),
    );
  });
});
