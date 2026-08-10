import type { BuiltinThemeStyleValue, ResolvedTheme, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle, ThemeTokenSource } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src';

import * as plot from '../../src';
import {
  applyPlotThemeToTokens,
  getPlotThemePreset,
  PlotResolvedThemeTokensSchema,
  plotThemeFromTokens,
  PlotThemeResolutionSchema,
  PlotThemeToken,
} from '../../src';

type PlotThemeResolution = {
  style: ResolvedTheme['style'];
  mode: ResolvedTheme['mode'];
  tokens: Record<string, unknown>;
  tokenSources: Array<{ token: string; kind: string; path: string }>;
  tokenRules: Array<{
    rule: NonNullable<IRPlotSpec['plotThemeTokenRules']>[number];
    kind: string;
    path: string;
  }>;
  authoredOverrides: Array<{ kind: string; path: string }>;
  plotTheme: IRPlotSpec['plotTheme'];
  palette: {
    categorical: Array<string>;
    series: Array<string>;
    sector: Array<string>;
    sequential: string;
    diverging: string;
  };
};

type ResolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input?: Pick<IRPlotSpec, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'>,
  plotThemeStyles?: ReadonlyArray<unknown>,
) => PlotThemeResolution;

const themeOf = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): ResolvedTheme => ({
  style,
  mode,
  colors: resolveCoreThemeColors(style, mode),
});

const sourceOf = (resolution: PlotThemeResolution, token: string) =>
  resolution.tokenSources.find(source => source.token === token);

describe('Plot theme resolver', () => {
  it('让同名自定义 Plot style palette 高于 Core shared colors', () => {
    const define = (plot as Record<string, unknown>).definePlotThemeStyle as
      | ((definition: {
          name: string;
          resolve: (theme: ResolvedTheme) => { tokens: Record<string, unknown>; tokenRules?: Array<unknown> };
        }) => unknown)
      | undefined;
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const baseline = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);

    expect(define).toBeTypeOf('function');
    const definition = define?.({
      name: 'brand',
      resolve: () => ({
        tokens: {
          ...baseline,
          [PlotThemeToken.PlotPaletteCategorical]: ['#brand-categorical'],
          [PlotThemeToken.PlotPaletteSeries]: ['#brand-series'],
          [PlotThemeToken.PlotPaletteSector]: ['#brand-sector'],
        },
      }),
    });
    const result = resolve(
      {
        style: 'brand',
        mode: ThemeMode.Light,
        colors: {
          semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
          categorical: ['#core-categorical'],
        },
      },
      {},
      [definition] as never,
    );

    expect(result.palette).toMatchObject({
      categorical: ['#brand-categorical'],
      series: ['#brand-series'],
      sector: ['#brand-sector'],
    });
    expect(sourceOf(result, PlotThemeToken.PlotPaletteCategorical)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$style/brand/light/plot.palette.categorical',
    });
  });

  it('拒绝缺少或重名的 Plot style definition', () => {
    const define = (plot as Record<string, unknown>).definePlotThemeStyle as
      | ((definition: {
          name: string;
          resolve: (theme: ResolvedTheme) => { tokens: Record<string, unknown> };
        }) => unknown)
      | undefined;
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const baseline = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const brand = define?.({ name: 'brand', resolve: () => ({ tokens: baseline }) });

    expect(() =>
      resolve(
        {
          style: 'brand',
          mode: ThemeMode.Light,
          colors: {
            semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
            categorical: ['#brand'],
          },
        },
        {},
      ),
    ).toThrow(/Plot theme style 'brand' is not registered/);
    expect(() =>
      resolve(
        {
          style: ThemeStyle.Neutral,
          mode: ThemeMode.Light,
          colors: {
            semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
            categorical: ['#brand'],
          },
        },
        {},
        [brand, brand],
      ),
    ).toThrow(/Plot theme style 'brand' is already registered/);
  });

  it('为四种 style 与两个 mode 提供独立的完整 preset', () => {
    const getPreset = (plot as Record<string, unknown>).getPlotThemePreset as
      | ((style: ResolvedTheme['style'], mode: ResolvedTheme['mode']) => unknown)
      | undefined;

    expect(getPreset).toBeDefined();
    for (const style of Object.values(ThemeStyle)) {
      for (const mode of Object.values(ThemeMode)) {
        const preset = getPreset?.(style, mode);
        expect(PlotResolvedThemeTokensSchema.parse(preset)).toEqual(preset);
      }
    }
  });

  it('让内建 Plot definition 从 effective Core theme 构造 categorical baseline', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const effectiveTheme: ResolvedTheme = {
      ...themeOf(ThemeStyle.Academic, ThemeMode.Dark),
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706' },
        categorical: ['#effective-core'],
      },
    };
    const result = resolve(effectiveTheme);

    expect(sourceOf(result, PlotThemeToken.PlotAreaFill)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$style/academic/dark/plot.area.fill',
    });
    for (const token of [
      PlotThemeToken.PlotPaletteCategorical,
      PlotThemeToken.PlotPaletteSeries,
      PlotThemeToken.PlotPaletteSector,
    ]) {
      expect(result.tokens[token]).toEqual(effectiveTheme.colors.categorical);
      expect(sourceOf(result, token)).toEqual({
        token,
        kind: ThemeTokenSource.Local,
        path: `$style/academic/dark/${token}`,
      });
    }
  });

  it('按 effective Theme、token、native theme 顺序解析并记录来源', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Academic, ThemeMode.Dark), {
      plotThemeTokens: {
        [PlotThemeToken.PlotAreaFill]: '#111111',
        [PlotThemeToken.PlotPaletteCategorical]: ['#token-categorical'],
        [PlotThemeToken.PlotPaletteSeries]: ['#token'],
      },
      plotTheme: {
        plotArea: { fill: '#native-area' },
        typography: { font: { family: 'serif' } },
        palette: { series: ['#theme'] },
      },
    });

    expect(result.style).toBe(ThemeStyle.Academic);
    expect(result.mode).toBe(ThemeMode.Dark);
    expect(result.tokens[PlotThemeToken.PlotAreaFill]).toBe('#native-area');
    expect(result.tokens[PlotThemeToken.PlotPaletteCategorical]).toEqual(['#token-categorical']);
    expect(result.tokens[PlotThemeToken.PlotPaletteSeries]).toEqual(['#theme']);
    expect(result.plotTheme?.typography?.font?.family).toBe('serif');
    expect(result.palette.series).toEqual(['#theme']);
    expect(sourceOf(result, PlotThemeToken.PlotAreaFill)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$spec/plotTheme/plotArea/fill',
    });
    expect(sourceOf(result, PlotThemeToken.PlotPaletteCategorical)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$spec/plotThemeTokens/plot.palette.categorical',
    });
    expect(sourceOf(result, PlotThemeToken.PlotPaletteSeries)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$spec/plotTheme/palette/series',
    });
    expect(result.authoredOverrides).toEqual([{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' }]);
  });

  it('返回深克隆、JSON-safe 且确定的结果', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const input = { plotThemeTokens: { [PlotThemeToken.PlotPaletteSeries]: ['#2563eb'] } };
    const first = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), input);
    const second = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), input);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first).not.toBe(second);
    expect(first.tokens).not.toBe(second.tokens);
    expect(first.palette.series).not.toBe(input.plotThemeTokens[PlotThemeToken.PlotPaletteSeries]);
  });

  it('inspection schema 只接受二元来源与唯一 authored override path', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), {
      plotTheme: { plotArea: { fill: '#ffffff' } },
    });

    expect(
      PlotThemeResolutionSchema.safeParse({
        ...result,
        tokenSources: result.tokenSources.map((source, index) =>
          index === 0 ? { ...source, kind: 'preset' } : source,
        ),
      }).success,
    ).toBe(false);
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...result,
        tokenSources: result.tokenSources.map(source =>
          source.token === PlotThemeToken.PlotAreaFill
            ? { ...source, kind: ThemeTokenSource.Inherit, path: '$theme/colors/categorical' }
            : source,
        ),
      }).success,
    ).toBe(false);
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...result,
        tokenSources: result.tokenSources.map(source =>
          source.token === PlotThemeToken.PlotPaletteCategorical
            ? { ...source, kind: ThemeTokenSource.Local, path: '$theme/colors/categorical' }
            : source,
        ),
      }).success,
    ).toBe(false);
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...result,
        authoredOverrides: [...result.authoredOverrides, ...result.authoredOverrides],
      }).success,
    ).toBe(false);
  });

  it('native theme 对数组、false 与不同 discriminator 对象做完整替换', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), {
      plotThemeTokens: {
        [PlotThemeToken.AxisTickMark]: { kind: 'line', length: 12 },
        [PlotThemeToken.PlotPaletteSeries]: ['#111111', '#222222'],
      },
      plotTheme: {
        axis: {
          line: false,
          ticks: { mark: { kind: 'circle', size: 5 } },
        },
        palette: { series: ['#333333'] },
      },
    });

    expect(result.plotTheme?.axis?.line).toBe(false);
    expect(result.tokens[PlotThemeToken.AxisLineEnabled]).toBe(false);
    expect(result.plotTheme?.axis?.ticks?.mark).toEqual({ kind: 'circle', size: 5 });
    expect(result.tokens[PlotThemeToken.AxisTickMark]).toEqual({ kind: 'circle', size: 5 });
    expect(result.plotTheme?.palette?.series).toEqual(['#333333']);
    expect(result.tokens[PlotThemeToken.PlotPaletteSeries]).toEqual(['#333333']);
  });

  it('保留 style 与 local Axis rules 的顺序和稳定来源', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), {
      plotThemeTokens: {
        [PlotThemeToken.AxisGridEnabled]: false,
      },
      plotThemeTokenRules: [
        {
          select: { dimension: 'x' },
          tokens: {
            [PlotThemeToken.AxisGridEnabled]: true,
            [PlotThemeToken.AxisTickLabelEnabled]: false,
          },
        },
      ],
    });

    expect(result.tokenRules).toEqual([
      {
        rule: {
          select: { dimension: 'y' },
          tokens: { [PlotThemeToken.AxisGridEnabled]: true },
        },
        kind: ThemeTokenSource.Local,
        path: '$style/neutral/light/tokenRules/0',
      },
      {
        rule: {
          select: { dimension: 'x' },
          tokens: {
            [PlotThemeToken.AxisGridEnabled]: true,
            [PlotThemeToken.AxisTickLabelEnabled]: false,
          },
        },
        kind: ThemeTokenSource.Local,
        path: '$spec/plotThemeTokenRules/0',
      },
    ]);
    expect(sourceOf(result, PlotThemeToken.AxisGridEnabled)).toMatchObject({
      path: '$spec/plotThemeTokens/axis.grid.enabled',
    });
  });

  it('把 native grid 投影到四个基础 token 并只标记 authored 字段', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), {
      plotTheme: {
        axis: {
          grid: {
            stroke: '#cbd5e1',
            dashPattern: [4, 2],
          },
        },
      },
    });

    expect(result.plotTheme?.axis?.grid).toMatchObject({
      stroke: '#cbd5e1',
      dashPattern: [4, 2],
    });
    expect(result.tokens[PlotThemeToken.AxisGridEnabled]).toBe(true);
    expect(result.tokens[PlotThemeToken.AxisGridStroke]).toBe('#cbd5e1');
    expect(sourceOf(result, PlotThemeToken.AxisGridEnabled)).toMatchObject({
      path: '$spec/plotTheme/axis/grid',
    });
    expect(sourceOf(result, PlotThemeToken.AxisGridStroke)).toMatchObject({
      path: '$spec/plotTheme/axis/grid/stroke',
    });
    expect(sourceOf(result, PlotThemeToken.AxisGridStrokeWidth)).toMatchObject({
      path: '$style/neutral/light/axis.grid.strokeWidth',
    });
  });

  it('保留 native theme 中没有对应 token 的合法字段', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Neutral, ThemeMode.Light), {
      plotTheme: {
        axis: {
          tickLabels: {
            rotate: -45,
            layout: { hide: { strategy: 'greedy' } },
          },
        },
      },
    });

    expect(result.plotTheme?.axis?.tickLabels).toMatchObject({
      rotate: -45,
      layout: { hide: { strategy: 'greedy' } },
    });
    expect(result.tokenSources.some(source => source.path.includes('rotate'))).toBe(false);
  });

  it('让启用后的每个 canonical token 都经正式 native theme mapping 唯一投影', () => {
    const preset = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const enabled = PlotResolvedThemeTokensSchema.parse({
      ...preset,
      [PlotThemeToken.AxisGridEnabled]: true,
    });
    const theme = plotThemeFromTokens(enabled);
    const projection = applyPlotThemeToTokens(enabled, theme, theme);
    const canonical = Object.values(PlotThemeToken);
    const projected = projection.overrides.map(override => override.token);

    expect(projection.tokens).toEqual(enabled);
    expect(new Set(projected)).toEqual(new Set(canonical));
    expect(new Set(projected).size).toBe(canonical.length);
  });
});
