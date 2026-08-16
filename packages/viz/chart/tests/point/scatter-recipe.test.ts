import { describe, expect, it } from 'vitest';

import type { ChartRecipeStyleContext } from '../../src/_shared';

import { ScatterChartSchema } from '../../src/point/scatter';
import { ScatterChartRecipe } from '../../src/point/scatter/recipe';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const scatter = (overrides: Record<string, unknown> = {}) =>
  ScatterChartSchema.parse({
    namespace: 'chart',
    type: 'scatter',
    id: 'sales',
    plot: { data: { reference: 'rows' } },
    config: {
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
      ...overrides,
    },
  });

const createScatterPlot = (overrides: Record<string, unknown> = {}, style = visibleStyle) =>
  ScatterChartRecipe.bind(scatter(overrides)).createPlot(style);

describe('Scatter Chart recipe', () => {
  it('generates the primary Point, spatial root, scales, and axis defaults', () => {
    expect(createScatterPlot()).toEqual({
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
  });

  it('maps visual channels and creates a size legend for field-driven size', () => {
    const plot = createScatterPlot({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        color: { field: 'group', scale: 'colorScale' },
        size: { field: 'weight' },
        opacity: { value: 0.7 },
        shape: { field: 'kind' },
      },
    });

    expect(plot.marks[0]).toMatchObject({
      color: { kind: 'field', value: 'group', scale: 'colorScale' },
      size: { kind: 'field', value: 'weight' },
      opacity: { kind: 'constant', value: 0.7 },
      shape: { kind: 'field', value: 'kind' },
    });
    expect(plot.guides).toContainEqual({ type: 'legend', channel: 'size' });
  });

  it('applies the type-specific mark configuration directly', () => {
    const plot = createScatterPlot({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        color: { value: '#2563eb' },
      },
      mark: {
        color: { kind: 'constant', value: '#dc2626' },
        strokeWidth: { kind: 'constant', value: 2 },
        encoding: { text: { field: 'label' } },
      },
    });

    expect(plot.marks[0]).toMatchObject({
      color: { kind: 'constant', value: '#dc2626' },
      strokeWidth: { kind: 'constant', value: 2 },
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        text: { field: 'label' },
      },
    });
  });

  it('uses style only for optional guide topology', () => {
    const plot = createScatterPlot(
      { encoding: { x: { field: 'amount' }, y: { field: 'margin' }, size: { field: 'weight' } } },
      { axisEnabled: false, axisGridEnabled: false, legendEnabled: false, seriesColor: '#475569' },
    );

    expect(plot.guides).toEqual([]);
  });
});
