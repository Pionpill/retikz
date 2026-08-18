import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';
import type { PlotThemeStyleDefinition } from '@retikz/plot';

import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { definePlotThemeStyle, getDefaultPlotThemePreset, PlotThemeToken } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import type { ChartThemeStyleDefinition } from '../../../src/_chart/style';

import * as chart from '../../../src';
import { resolveChart } from '../../../src/_chart/resolve';
import { getDefaultChartThemePreset } from '../../../src/_chart/style';
import { ScatterChartRecipe, ScatterChartSchema } from '../../../src/point';

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  plot: { data: { reference: 'rows' } },
  config: { encoding: { x: { field: 'amount' }, y: { field: 'margin' } } },
} as const;

const themeOf = (style: string | undefined, mode: ThemeModeValue): ResolvedTheme => ({
  ...(style === undefined ? {} : { style }),
  mode,
  colors: resolveDefaultCoreThemeColors(mode),
});

type ResolveChartIR = (
  input: unknown,
  effectiveTheme?: ResolvedTheme,
  options?: Readonly<{
    chartThemeStyles?: ReadonlyArray<ChartThemeStyleDefinition>;
    plotThemeStyles?: ReadonlyArray<PlotThemeStyleDefinition>;
  }>,
) => ReturnType<typeof resolveChart>;

const resolve: ResolveChartIR = (input, effectiveTheme = themeOf(undefined, ThemeMode.Light), options = {}) =>
  resolveChart(ScatterChartRecipe.bind(ScatterChartSchema.parse(input)), {
    theme: effectiveTheme,
    ...(options.chartThemeStyles === undefined ? {} : { chartThemeStyles: options.chartThemeStyles }),
    ...(options.plotThemeStyles === undefined ? {} : { plotThemeStyles: options.plotThemeStyles }),
  });

describe('Chart style resolution', () => {
  it('以同名 Chart 与 Plot style definitions 驱动各自 owner 行为', () => {
    const define = chart.defineChartThemeStyle;
    const chartBaseline = getDefaultChartThemePreset(ThemeMode.Light);
    const plotBaseline = getDefaultPlotThemePreset(ThemeMode.Light);
    const chartStyle = define({
      name: 'brand',
      resolve: () => ({ ...chartBaseline, 'chart.axis.enabled': false }),
    });
    const plotStyle = definePlotThemeStyle({
      name: 'brand',
      resolve: () => ({
        tokens: {
          ...plotBaseline,
          [PlotThemeToken.PlotPaletteSeries]: ['#brand-series'],
        },
      }),
    });

    expect(define).toBeTypeOf('function');
    const result = resolve(
      base,
      {
        style: 'brand',
        mode: ThemeMode.Light,
        colors: {
          semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
          categorical: ['#core-categorical'],
        },
      },
      { chartThemeStyles: [chartStyle], plotThemeStyles: [plotStyle] },
    );

    expect(result.plotSpec.guides).toEqual([]);
  });

  it('分别报告缺失的 Chart 与 Plot style definition', () => {
    const theme: ResolvedTheme = {
      style: 'brand',
      mode: ThemeMode.Light,
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
        categorical: ['#core-categorical'],
      },
    };

    expect(() => resolve(base, theme)).toThrow(/Chart theme style 'brand' is not registered/);
    expect(() =>
      resolve(base, theme, {
        chartThemeStyles: [
          chart.defineChartThemeStyle({
            name: 'brand',
            resolve: () => getDefaultChartThemePreset(ThemeMode.Light),
          }),
        ],
      }),
    ).toThrow(/Plot theme style 'brand' is not registered/);
  });

  it('默认解析 light baseline，并保持 Plot authoring 输入未物化', () => {
    const result = resolve(base);
    expect(result.plotSpec.plotTheme).toBeUndefined();
    expect(result.plotSpec.plotThemeTokens).toBeUndefined();
    expect(result.plotSpec.guides).toHaveLength(2);
  });

  it('解析 Chart token 与 Plot cascade，并原样转发 Plot 输入', () => {
    const input = {
      ...base,
      chartThemeTokens: { 'chart.padding': 20 },
      plot: {
        ...base.plot,
        plotThemeTokens: {
          'plot.typography.font.size': 14,
          'plot.palette.categorical': ['#token'],
        },
        plotThemeTokenRules: [
          {
            select: { dimension: 'x' },
            tokens: { 'axis.tickLabel.enabled': false },
          },
        ],
        plotTheme: {
          typography: { font: { weight: 700 } },
          palette: {
            categorical: ['#raw-categorical'],
            series: ['#raw-series'],
            sector: ['#raw-sector'],
          },
        },
      },
    } as const;
    const result = resolve(input, themeOf(undefined, ThemeMode.Dark));

    expect(result.plotSpec.plotThemeTokens).toEqual(input.plot.plotThemeTokens);
    expect(result.plotSpec.plotThemeTokenRules).toEqual(input.plot.plotThemeTokenRules);
    expect(result.plotSpec.plotTheme).toEqual(input.plot.plotTheme);
  });

  it('topology token 只控制 recipe defaults，显式 guide 保持最高优先级', () => {
    expect(resolve({ ...base, chartThemeTokens: { 'chart.axis.enabled': false } }).plotSpec.guides).toEqual([]);
    expect(
      resolve({
        ...base,
        chartThemeTokens: { 'chart.axis.enabled': false, 'chart.axis.grid.enabled': false },
        plot: {
          ...base.plot,
          guides: [{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }],
        },
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }]);
  });

  it('effective Theme 切换不改变 data、核心 recipe、空间根与 identity', () => {
    const defaultLight = resolve(base);
    const defaultDark = resolve(base, themeOf(undefined, ThemeMode.Dark));
    const stableProjection = (result: typeof defaultLight) => ({
      data: result.plotSpec.data,
      transform: result.plotSpec.transform,
      scales: result.plotSpec.scales,
      coordinate: result.plotSpec.coordinate,
      composition: result.plotSpec.composition,
      marks: result.plotSpec.marks,
      chart: result.chart,
    });
    expect(stableProjection(defaultDark)).toEqual(stableProjection(defaultLight));
  });
});
