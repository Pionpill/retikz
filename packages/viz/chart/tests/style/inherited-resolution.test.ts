import type { ResolvedTheme } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

const effectiveTheme: ResolvedTheme = {
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  tokens: {
    chart: {
      'chart.padding': 24,
      'chart.title.font.size': 31,
      'chart.axis.enabled': false,
    },
    plot: {
      'plot.palette.categorical': ['#inherited-categorical'],
      'plot.palette.series': ['#inherited-series'],
      'plot.palette.sequential': 'magma',
    },
  },
  colors: {
    ...resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
    categorical: ['#core-categorical'],
  },
};

describe('Chart inherited theme resolution', () => {
  it('merges inherited Chart tokens before local Chart tokens without replacing omitted keys', () => {
    const result = resolveChartSpec(
      {
        ...base,
        chartThemeTokens: {
          'chart.padding': 32,
          'chart.axis.grid.enabled': false,
        },
      },
      effectiveTheme,
    );

    expect(result.inspection.style.chart.tokens).toMatchObject({
      'chart.padding': 32,
      'chart.title.font.size': 31,
      'chart.axis.enabled': false,
      'chart.axis.grid.enabled': false,
    });
    expect(result.inspection.style.chart.tokenSources).toEqual(
      expect.arrayContaining([
        { token: 'chart.padding', kind: 'local', path: '$spec/chartThemeTokens/chart.padding' },
        { token: 'chart.title.font.size', kind: 'inherited', path: '$theme/tokens/chart/chart.title.font.size' },
        { token: 'chart.axis.enabled', kind: 'inherited', path: '$theme/tokens/chart/chart.axis.enabled' },
        { token: 'chart.axis.grid.enabled', kind: 'local', path: '$spec/chartThemeTokens/chart.axis.grid.enabled' },
      ]),
    );
  });

  it('hands the same Plot cascade to the recipe and preserves only authored Plot layers', () => {
    const input = {
      ...base,
      chartThemeTokens: { 'chart.padding': 32 },
      plotThemeTokens: { 'plot.palette.series': ['#local-series'] },
      colors: ['#colors-a', '#colors-b'],
      plotTheme: { palette: { series: ['#native-series'] } },
    } as const;
    const result = resolveChartSpec(input, effectiveTheme);

    expect(result.inspection.style.plot.palette).toMatchObject({
      categorical: ['#colors-a', '#colors-b'],
      series: ['#native-series'],
      sector: ['#colors-a', '#colors-b'],
      sequential: 'magma',
    });
    expect(result.inspection.style.plot.tokenSources).toEqual(
      expect.arrayContaining([
        { token: 'plot.palette.categorical', kind: 'colors', path: '$spec/colors' },
        { token: 'plot.palette.series', kind: 'plot-theme', path: '$spec/plotTheme/palette/series' },
        { token: 'plot.palette.sector', kind: 'colors', path: '$spec/colors' },
        { token: 'plot.palette.sequential', kind: 'inherited', path: '$theme/tokens/plot/plot.palette.sequential' },
      ]),
    );
    expect(result.plotSpec.plotThemeTokens).toEqual(input.plotThemeTokens);
    expect(result.plotSpec.colors).toEqual(input.colors);
    expect(result.plotSpec.plotTheme).toEqual(input.plotTheme);
    expect(result.plotSpec).not.toHaveProperty('tokens');
    expect(result.plotSpec).not.toHaveProperty('palette');
  });

  it('uses the Plot final series palette for the default connected-scatter color', () => {
    const result = resolveChartSpec(
      {
        ...base,
        type: 'connected-scatter',
        encoding: { x: { field: 'amount' }, y: { field: 'margin' }, order: 'time' },
      },
      effectiveTheme,
    );

    expect(result.plotSpec.marks[0]).toMatchObject({
      stroke: { kind: 'constant', value: '#inherited-series' },
    });
    expect(result.plotSpec.marks[1]).toMatchObject({
      color: { kind: 'constant', value: '#inherited-series' },
    });
    expect(result.plotSpec.marks[0]).not.toMatchObject({
      stroke: { kind: 'constant', value: '#core-categorical' },
    });
  });
});
