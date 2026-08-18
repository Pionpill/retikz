import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChart } from '../../src/_chart/resolve';
import { ConnectedScatterChartRecipe, ConnectedScatterChartSchema } from '../../src/point';

const resolve = (input: unknown) =>
  resolveChart(ConnectedScatterChartRecipe.bind(ConnectedScatterChartSchema.parse(input)), {
    theme: {
      mode: ThemeMode.Light,
      colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
    },
  });

describe('Connected Scatter Chart resolution', () => {
  it('keeps the connected path recipe inside IRBaseChart', () => {
    const result = resolve({
      namespace: 'chart',
      type: 'connected-scatter',
      plot: { data: { reference: 'rows' } },
      config: {
        encoding: {
          x: { field: 'x' },
          y: { field: 'y' },
          series: 'series',
          order: 'year',
        },
      },
    });

    expect(result.chart.type).toBe('base');
    expect(result.plotSpec.marks.some(mark => mark.type === 'path')).toBe(true);
  });
});
