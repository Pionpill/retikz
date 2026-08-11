import { describe, expect, expectTypeOf, it } from 'vitest';

import type { IRChart, IRChartPresentation } from '../src';

import * as chart from '../src';

describe('@retikz/chart public surface', () => {
  it('exports the canonical Chart contract, four presets, typed schemas, and one provider', () => {
    expect(chart.ChartPresentationPreset).toEqual({
      Title: 'title',
      Subtitle: 'subtitle',
      Note: 'note',
      Source: 'source',
    });
    expect(chart.ChartProvider.key).toEqual({ namespace: 'chart', type: 'chart' });
    expect(chart).toHaveProperty('ChartDefinition');
    expect(chart).toHaveProperty('ChartSchema');
    expect(chart).toHaveProperty('ScatterChartSpecSchema');
    expect(chart).not.toHaveProperty('ScatterChartDefinition');
    expect(chart).not.toHaveProperty('createChartComposites');
    expect(chart).not.toHaveProperty('ChartCaption');
    expect(chart).not.toHaveProperty('ChartCredit');
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
