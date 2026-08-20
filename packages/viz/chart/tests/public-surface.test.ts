import { describe, expect, it } from 'vitest';

import type { IRBaseChart, IRChartPresentation } from '../src';

import * as chart from '../src';
import * as point from '../src/point';

describe('@retikz/chart public surface', () => {
  it('exports the Base Chart contract, four presets, and one provider', () => {
    expect(chart.ChartPresentationPreset).toEqual({
      Title: 'title',
      Subtitle: 'subtitle',
      Note: 'note',
      Source: 'source',
    });
    expect(chart.ChartProvider.key).toEqual({ capability: 'composite', namespace: 'chart', type: 'base' });
    expect(chart).toHaveProperty('ChartDefinition');
    expect(chart).toHaveProperty('BaseChartSchema');
    expect(chart).not.toHaveProperty('ChartSchema');
    expect(chart).not.toHaveProperty('IRChart');
    expect(chart).not.toHaveProperty('PointChartSchema');
    expect(chart).not.toHaveProperty('ScatterChartSchema');
    expect(chart).not.toHaveProperty('BubbleChartSchema');
    expect(chart).not.toHaveProperty('ConnectedScatterChartSchema');
    expect(chart.BaseChartType).toEqual({ Base: 'base' });
    expect(chart).not.toHaveProperty('ChartType');
    expect(chart).not.toHaveProperty('PointChartType');
    expect(chart).toHaveProperty('bindChart');
    expect(chart).toHaveProperty('resolveChart');
    expect(chart).toHaveProperty('BaseChartRecipe');
    expect(chart).not.toHaveProperty('BUILTIN_CHART_RECIPES_BY_TYPE');
    expect(chart).not.toHaveProperty('ScatterChartDefinition');
    expect(chart).not.toHaveProperty('createChartComposites');
    expect(chart).not.toHaveProperty('ChartCaption');
    expect(chart).not.toHaveProperty('ChartCredit');
  });

  it('exports the Point family together with the base Chart contract from its subpath', () => {
    expect(point.BaseChartSchema).toBe(chart.BaseChartSchema);
    expect(point.ChartDefinition).toBe(chart.ChartDefinition);
    expect(point.BaseChartType).toEqual({ Base: 'base' });
    expect(point.PointChartType).toEqual({
      Scatter: 'scatter',
      Bubble: 'bubble',
      ConnectedScatter: 'connected-scatter',
    });
    expect(point).not.toHaveProperty('PointChartSchema');
    expect(point).toHaveProperty('ScatterChartSchema');
    expect(point).toHaveProperty('BubbleChartSchema');
    expect(point).toHaveProperty('ConnectedScatterChartSchema');
    expect(point).toHaveProperty('ScatterChartRecipe');
    expect(point).toHaveProperty('BubbleChartRecipe');
    expect(point).toHaveProperty('ConnectedScatterChartRecipe');
    expect(point).not.toHaveProperty('resolvePointChart');
  });

  it('keeps canonical IR JSON-safe', () => {
    const presentation: IRChartPresentation = {
      children: [
        { kind: 'preset', key: 'chart.presentation.title', preset: 'title', text: 'Title' },
        { kind: 'plot', key: 'chart.plot' },
      ],
    };
    const value: IRBaseChart = chart.BaseChartSchema.parse({
      namespace: 'chart',
      type: 'base',
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
    expect(JSON.parse(JSON.stringify(value))).toEqual(value);
  });
});
