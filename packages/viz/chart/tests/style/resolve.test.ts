import type { BuiltinThemeStyleValue, ResolvedTheme, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle, ThemeTokenSource } from '@retikz/core';
import { definePlotThemeStyle, getPlotThemePreset, PlotThemeToken } from '@retikz/plot';
import { describe, expect, it } from 'vitest';

import * as chart from '../../src';
import { resolveChartSpec } from '../../src/resolution';
import { ChartThemeToken, getChartThemePreset } from '../../src/style';

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

const themeOf = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): ResolvedTheme => ({
  style,
  mode,
  colors: resolveCoreThemeColors(style, mode),
});

type ResolveChartSpec = (
  input: unknown,
  effectiveTheme?: ResolvedTheme,
  options?: Readonly<{
    chartThemeStyles?: ReadonlyArray<unknown>;
    plotThemeStyles?: ReadonlyArray<unknown>;
  }>,
) => ReturnType<typeof resolveChartSpec>;

describe('Chart style resolution', () => {
  it('以同名 Chart 与 Plot style definitions 解析各自 owner token', () => {
    const define = (chart as Record<string, unknown>).defineChartThemeStyle as
      | ((definition: { name: string; resolve: (theme: ResolvedTheme) => Record<string, unknown> }) => unknown)
      | undefined;
    const resolve = resolveChartSpec as unknown as ResolveChartSpec;
    const chartBaseline = getChartThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const plotBaseline = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const chartStyle = define?.({
      name: 'brand',
      resolve: () => ({ ...chartBaseline, [ChartThemeToken.ChartPadding]: 24 }),
    });
    const plotStyle = definePlotThemeStyle({
      name: 'brand',
      resolve: () => ({
        ...plotBaseline,
        [PlotThemeToken.PlotPaletteSeries]: ['#brand-series'],
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

    expect(result.inspection.style.chart.tokens[ChartThemeToken.ChartPadding]).toBe(24);
    expect(
      result.inspection.style.chart.tokenSources.find(source => source.token === ChartThemeToken.ChartPadding),
    ).toEqual({
      token: ChartThemeToken.ChartPadding,
      kind: ThemeTokenSource.Local,
      path: '$style/brand/light/chart.padding',
    });
    expect(result.inspection.style.plot.palette.series).toEqual(['#brand-series']);
  });

  it('分别报告缺失的 Chart 与 Plot style definition', () => {
    const resolve = resolveChartSpec as unknown as ResolveChartSpec;
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
          (chart as Record<string, unknown>).defineChartThemeStyle
            ? ((chart as Record<string, unknown>).defineChartThemeStyle as (definition: unknown) => unknown)({
                name: 'brand',
                resolve: () => getChartThemePreset(ThemeStyle.Neutral, ThemeMode.Light),
              })
            : undefined,
        ],
      }),
    ).toThrow(/Plot theme style 'brand' is not registered/);
  });

  it('默认解析 neutral/light，并保持 Plot authoring 输入未物化', () => {
    const result = resolveChartSpec(base);
    expect(result.plotSpec.plotTheme).toBeUndefined();
    expect(result.plotSpec.plotThemeTokens).toBeUndefined();
    expect(result.inspection.style.chart).toMatchObject({
      style: 'neutral',
      mode: 'light',
      tokens: { [ChartThemeToken.ChartCanvasFill]: '#FFFFFF' },
    });
    expect(result.inspection.style.chart.tokenSources).toHaveLength(37);
    expect(result.inspection.style.chart.tokenSources[0]).toEqual({
      token: ChartThemeToken.ChartCanvasFill,
      kind: ThemeTokenSource.Local,
      path: '$style/neutral/light/chart.canvas.fill',
    });
    expect(result.inspection.style.plot).toMatchObject({ style: 'neutral', mode: 'light' });
    expect(result.inspection.style.plot.tokenSources).toHaveLength(40);
  });

  it('分别解析 Chart token 与 Plot cascade，并原样转发 Plot 输入', () => {
    const input = {
      ...base,
      chartThemeTokens: { 'chart.padding': 20 },
      plotThemeTokens: {
        'plot.label.font.size': 14,
        'plot.palette.categorical': ['#token'],
      },
      plotTheme: {
        labelText: { font: { weight: 700 } },
        palette: {
          categorical: ['#raw-categorical'],
          series: ['#raw-series'],
          sector: ['#raw-sector'],
        },
      },
    } as const;
    const result = resolveChartSpec(input, themeOf(ThemeStyle.Academic, ThemeMode.Dark));

    expect(result.plotSpec.plotThemeTokens).toEqual(input.plotThemeTokens);
    expect(result.plotSpec.plotTheme).toEqual(input.plotTheme);
    expect(result.inspection.style.chart.tokens['chart.padding']).toBe(20);
    expect(
      result.inspection.style.chart.tokenSources.find(source => source.token === ChartThemeToken.ChartPadding),
    ).toEqual({
      token: ChartThemeToken.ChartPadding,
      kind: ThemeTokenSource.Local,
      path: '$spec/chartThemeTokens/chart.padding',
    });
    expect(result.inspection.style.plot.plotTheme.labelText).toMatchObject({ font: { size: 14, weight: 700 } });
    expect(result.inspection.style.plot.palette).toMatchObject({
      categorical: ['#raw-categorical'],
      series: ['#raw-series'],
      sector: ['#raw-sector'],
    });
    expect(result.inspection.style.plot.authoredOverrides).toEqual([
      { kind: ThemeTokenSource.Local, path: '$spec/plotTheme' },
    ]);
  });

  it('topology token 只控制 recipe defaults，显式 guide 保持最高优先级', () => {
    expect(resolveChartSpec({ ...base, chartThemeTokens: { 'chart.axis.enabled': false } }).plotSpec.guides).toEqual(
      [],
    );
    expect(
      resolveChartSpec({
        ...base,
        chartThemeTokens: { 'chart.axis.enabled': false, 'chart.axis.grid.enabled': false },
        guides: [{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }]);
  });

  it('effective Theme 切换不改变 data、核心 recipe、空间根与 identity', () => {
    const neutral = resolveChartSpec(base);
    const clean = resolveChartSpec(base, themeOf(ThemeStyle.Clean, ThemeMode.Dark));
    const stableProjection = (result: typeof neutral) => ({
      data: result.plotSpec.data,
      transform: result.plotSpec.transform,
      scales: result.plotSpec.scales,
      coordinate: result.plotSpec.coordinate,
      composition: result.plotSpec.composition,
      marks: result.plotSpec.marks,
      chart: result.inspection.chart,
      plot: result.inspection.plot,
      memberTargets: result.inspection.members
        .filter(member => member.kind !== 'guide')
        .map(member => [member.kind, member.target]),
    });
    expect(stableProjection(clean)).toEqual(stableProjection(neutral));
  });
});
