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
    expect(chart).not.toHaveProperty('createChartDefinition');
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
    expect(chart).not.toHaveProperty('createChart');
    expect(chart).not.toHaveProperty('normalizeChartPresentation');
    expect(chart).not.toHaveProperty('ChartPresentationPosition');
    expect(chart).not.toHaveProperty('DEFAULT_CHART_DATA_REFERENCE');
    expect(chart).not.toHaveProperty('chartIssuePathOf');
    expect(chart).not.toHaveProperty('invalidChartSchemaError');
    expect(chart).not.toHaveProperty('createChartRecipePlot');
    expect(chart).not.toHaveProperty('bindChartRecipe');
    expect(chart).not.toHaveProperty('chartRecipeOf');
    expect(chart).not.toHaveProperty('ChartDispatchSchema');
    expect(chart).not.toHaveProperty('resolveChartPresentation');
    expect(chart).not.toHaveProperty('resolveChartThemeStyleRegistry');
    expect(chart).not.toHaveProperty('resolveChartStyle');
  });

  it('exports only the Point family contract from its subpath', () => {
    expect(point).not.toHaveProperty('BaseChartSchema');
    expect(point).not.toHaveProperty('ChartDefinition');
    expect(point).not.toHaveProperty('BaseChartType');
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
    expect(point).toHaveProperty('BubblePointPatchSchema');
    expect(point).toHaveProperty('ScatterPointPatchSchema');
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
