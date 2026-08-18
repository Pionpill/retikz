import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChart } from '../../src/_chart/resolve';
import { ScatterChartRecipe, ScatterChartSchema } from '../../src/point';

const resolve = (input: unknown) =>
  resolveChart(ScatterChartRecipe.bind(ScatterChartSchema.parse(input)), {
    theme: {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    },
  });

describe('Scatter Chart resolution', () => {
  it('resolves typed input to one canonical chart.base over a complete IRPlot', () => {
    const result = resolve({
      namespace: 'chart',
      type: 'scatter',
      id: 'sales',
      presentation: {
        children: [
          {
            kind: 'preset',
            key: 'chart.presentation.title',
            preset: 'title',
            text: 'Sales',
          },
          { kind: 'plot', key: 'chart.plot' },
          {
            kind: 'preset',
            key: 'chart.presentation.source',
            preset: 'source',
            text: 'Internal',
          },
        ],
      },
      plot: { data: { reference: 'rows' } },
      config: { encoding: { x: { field: 'x' }, y: { field: 'y' } } },
    });

    expect(result.chart).toMatchObject({
      namespace: 'chart',
      type: 'base',
      id: 'sales',
      plot: {
        namespace: 'plot',
        type: 'plot',
        id: 'sales/plot',
        marks: [{ type: 'point', id: '__chart.scatter.mark.main' }],
      },
      presentation: {
        children: [{ preset: 'title' }, { kind: 'plot', key: 'chart.plot' }, { preset: 'source' }],
      },
    });
  });

  it('keeps authored point channels and required x/y recipe members', () => {
    const plot = resolve({
      namespace: 'chart',
      type: 'scatter',
      plot: { data: { reference: 'rows' } },
      config: {
        encoding: {
          x: { field: 'x' },
          y: { field: 'y' },
          color: { field: 'region' },
          size: { field: 'weight' },
        },
      },
    }).plotSpec;

    expect(plot.marks[0]).toMatchObject({
      type: 'point',
      encoding: {
        x: { field: 'x' },
        y: { field: 'y' },
      },
      color: { kind: 'field', value: 'region' },
      size: { kind: 'field', value: 'weight' },
    });
  });
});
