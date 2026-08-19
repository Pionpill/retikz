import { describe, expect, it } from 'vitest';

import type { ChartRecipeStyleContext } from '../../src/_shared';

import { ConnectedScatterChartRecipe, ConnectedScatterChartSchema } from '../../src/point/connected-scatter';

const visibleStyle: ChartRecipeStyleContext = {
  axisEnabled: true,
  axisGridEnabled: true,
  legendEnabled: true,
  seriesColor: '#475569',
};

const connectedScatter = (overrides: Record<string, unknown> = {}) =>
  ConnectedScatterChartSchema.parse({
    namespace: 'chart',
    type: 'connected-scatter',
    id: 'journey',
    plot: { data: { reference: 'rows' } },
    config: {
      encoding: { x: { field: 'amount' }, y: { field: 'margin' }, order: 'month' },
      ...overrides,
    },
  });

const createConnectedScatterPlot = (overrides: Record<string, unknown> = {}, style = visibleStyle) =>
  ConnectedScatterChartRecipe.bind(connectedScatter(overrides)).createPlot(style);

describe('Connected Scatter Chart recipe', () => {
  it('generates an open ordered Path before its Point mark', () => {
    const plot = createConnectedScatterPlot();

    expect(plot.marks[0]).toMatchObject({
      type: 'path',
      order: 'month',
      closed: false,
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
    expect(plot.marks[1]).toMatchObject({
      type: 'point',
      encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
    });
  });

  it('maps a field color to one ordinal scale and a color legend', () => {
    const plot = createConnectedScatterPlot({
      encoding: {
        x: { field: 'amount' },
        y: { field: 'margin' },
        order: 'month',
        color: { field: 'group' },
      },
    });

    expect(plot.scales).toContainEqual({ type: 'ordinal', name: '__chart.connected-scatter.scale.color' });
    expect(plot.marks[0]).toMatchObject({
      series: 'group',
      encoding: { color: { field: 'group', scale: '__chart.connected-scatter.scale.color' } },
    });
    expect(plot.guides).toContainEqual({
      type: 'legend',
      channel: 'color',
      scale: '__chart.connected-scatter.scale.color',
    });
  });

  it('applies point and connection configuration directly', () => {
    const plot = createConnectedScatterPlot({
      mark: { color: { kind: 'constant', value: '#dc2626' } },
      components: { connection: { strokeWidth: { kind: 'constant', value: 2 } } },
    });

    expect(plot.marks[0]).toMatchObject({ strokeWidth: { kind: 'constant', value: 2 } });
    expect(plot.marks[1]).toMatchObject({ color: { kind: 'constant', value: '#dc2626' } });
  });
});
