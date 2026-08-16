import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRChart, IRChartPresentation } from '../src';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart public surface', () => {
  it('exports the canonical base Chart contract, four presets, and one provider', () => {
    expect(chart.ChartPresentationPreset).toEqual({
      Title: 'title',
      Subtitle: 'subtitle',
      Note: 'note',
      Source: 'source',
    });
    expect(chart.ChartProvider.key).toEqual({ namespace: 'chart', type: 'chart' });
    expect(chart).toHaveProperty('ChartDefinition');
    expect(chart).toHaveProperty('ChartSchema');
    expect(chart).not.toHaveProperty('PointChartType');
    expect(chart).not.toHaveProperty('PointChartSchema');
    expect(chart).not.toHaveProperty('ScatterChartSchema');
    expect(chart).not.toHaveProperty('BubbleChartSchema');
    expect(chart).not.toHaveProperty('ConnectedScatterChartSchema');
    expect(chart).not.toHaveProperty('resolvePointChart');
    expect(chart).not.toHaveProperty('ScatterChartDefinition');
    expect(chart).not.toHaveProperty('createChartComposites');
    expect(chart).not.toHaveProperty('ChartCaption');
    expect(chart).not.toHaveProperty('ChartCredit');
  });

  it('exports the Point family together with the base Chart contract from its subpath', () => {
    expect(point.ChartSchema).toBe(chart.ChartSchema);
    expect(point.ChartDefinition).toBe(chart.ChartDefinition);
    expect(point.PointChartType).toEqual({
      Scatter: 'scatter',
      Bubble: 'bubble',
      ConnectedScatter: 'connected-scatter',
    });
    expect(point).toHaveProperty('PointChartSchema');
    expect(point).toHaveProperty('ScatterChartSchema');
    expect(point).toHaveProperty('BubbleChartSchema');
    expect(point).toHaveProperty('ConnectedScatterChartSchema');
    expect(point).toHaveProperty('resolvePointChart');
  });

  it('keeps canonical IR JSON-safe', () => {
    const presentation: IRChartPresentation = {
      children: [
        { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Title' },
        { kind: 'plot', key: 'chart.plot' },
      ],
    };
    const value: IRChart = chart.ChartSchema.parse({
      namespace: 'chart',
      type: 'chart',
      plot: {
        namespace: 'plot',
        type: 'plot',
        data: { reference: 'rows' },
        scales: [{ type: 'linear', name: 'x' }],
        coordinate: { type: 'cartesian1D', x: 'x' },
        marks: [{ type: 'point', encoding: { x: { field: 'value', scale: 'x' } } }],
      },
      presentation,
    });

    expectTypeOf(value).toMatchTypeOf<IRChart>();
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
