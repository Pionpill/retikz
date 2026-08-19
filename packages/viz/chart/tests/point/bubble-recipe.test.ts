import { describe, expect, it } from 'vitest';

import type { ChartRecipeStyleContext } from '../../src/_shared';

import { BubbleChartRecipe, BubbleChartSchema } from '../../src/point/bubble';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const bubble = (overrides: Record<string, unknown> = {}) =>
  BubbleChartSchema.parse({
    namespace: 'chart',
    type: 'bubble',
    id: 'sales',
    plot: { data: { reference: 'rows' } },
    config: {
      encoding: { x: { field: 'amount' }, y: { field: 'margin' }, size: { field: 'volume' } },
      ...overrides,
    },
  });

const createBubblePlot = (overrides: Record<string, unknown> = {}, style = visibleStyle) =>
  BubbleChartRecipe.bind(bubble(overrides)).createPlot(style);

describe('Bubble Chart recipe', () => {
  it('generates a Point with the required quantitative size and legend', () => {
    const plot = createBubblePlot();

    expect(plot.marks[0]).toMatchObject({
      type: 'point',
      size: { kind: 'field', value: 'volume' },
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
    expect(plot.guides).toContainEqual({ type: 'legend', channel: 'size' });
  });

  it('keeps the authored scale identity and applies compatible mark configuration', () => {
    const plot = createBubblePlot({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        size: { field: 'volume', scale: 'volume-radius' },
      },
      mark: {
        color: { kind: 'constant', value: '#dc2626' },
        opacity: { kind: 'constant', value: 0.8 },
      },
    });

    expect(plot.marks[0]).toMatchObject({
      color: { kind: 'constant', value: '#dc2626' },
      opacity: { kind: 'constant', value: 0.8 },
    });
    expect(plot.guides).toContainEqual({ type: 'legend', channel: 'size', scale: 'volume-radius' });
  });
});
