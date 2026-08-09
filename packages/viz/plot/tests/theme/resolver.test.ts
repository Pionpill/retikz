import type { BuiltinThemeStyleValue, ResolvedTheme, ThemeModeValue } from '@retikz/core';

import { resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src';

import * as plot from '../../src';
import {
  applyPlotThemeToTokens,
  getPlotThemePreset,
  PlotResolvedThemeTokensSchema,
  plotThemeFromTokens,
  PlotThemeToken,
} from '../../src';

type PlotThemeResolution = {
  style: ResolvedTheme['style'];
  mode: ResolvedTheme['mode'];
  tokens: Record<string, unknown>;
  tokenSources: Array<{ token: string; kind: string; path: string }>;
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
  input?: Pick<IRPlotSpec, 'plotThemeTokens' | 'colors' | 'plotTheme'>,
  plotThemeStyles?: ReadonlyArray<unknown>,
) => PlotThemeResolution;

const themeOf = (style: BuiltinThemeStyleValue, mode: ThemeModeValue): ResolvedTheme => ({
  style,
  mode,
  colors: resolveCoreThemeColors(style, mode),
});

describe('Plot theme resolver', () => {
  it('通过同名自定义 style definition 解析完整 Plot token 基线', () => {
    const define = (plot as Record<string, unknown>).definePlotThemeStyle as
      | ((definition: { name: string; resolve: (theme: ResolvedTheme) => Record<string, unknown> }) => unknown)
      | undefined;
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const baseline = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);

    expect(define).toBeTypeOf('function');
    const definition = define?.({
      name: 'brand',
      resolve: () => ({
        ...baseline,
        [PlotThemeToken.PlotPaletteCategorical]: ['#brand-categorical'],
        [PlotThemeToken.PlotPaletteSeries]: ['#brand-series'],
        [PlotThemeToken.PlotPaletteSector]: ['#brand-sector'],
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
  });

  it('拒绝缺少或重名的 Plot style definition', () => {
    const define = (plot as Record<string, unknown>).definePlotThemeStyle as
      | ((definition: { name: string; resolve: (theme: ResolvedTheme) => Record<string, unknown> }) => unknown)
      | undefined;
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const baseline = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const brand = define?.({ name: 'brand', resolve: () => baseline });

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

  it('按 effective Theme、token、colors、native theme 顺序解析并记录来源', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(ThemeStyle.Academic, ThemeMode.Dark), {
      plotThemeTokens: {
        [PlotThemeToken.PlotSurfaceFill]: '#111111',
        [PlotThemeToken.PlotPaletteSeries]: ['#token'],
      },
      colors: ['#colors'],
      plotTheme: {
        typography: { font: { family: 'serif' } },
        palette: { series: ['#theme'] },
      },
    });

    expect(result.style).toBe(ThemeStyle.Academic);
    expect(result.mode).toBe(ThemeMode.Dark);
    expect(result.tokens[PlotThemeToken.PlotSurfaceFill]).toBe('#111111');
    expect(result.tokens[PlotThemeToken.PlotPaletteCategorical]).toEqual(['#colors']);
    expect(result.tokens[PlotThemeToken.PlotPaletteSeries]).toEqual(['#theme']);
    expect(result.plotTheme?.typography?.font?.family).toBe('serif');
    expect(result.palette.series).toEqual(['#theme']);
    expect(result.tokenSources.find(source => source.token === PlotThemeToken.PlotPaletteSeries)?.kind).toBe(
      'plot-theme',
    );
    expect(result.authoredOverrides.map(source => source.kind)).toEqual(['colors', 'plot-theme']);
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

  it('让每个 canonical token 都经正式 native theme mapping 唯一投影', () => {
    const preset = getPlotThemePreset(ThemeStyle.Neutral, ThemeMode.Light);
    const theme = plotThemeFromTokens(preset);
    const projection = applyPlotThemeToTokens(preset, theme, theme);
    const canonical = Object.values(PlotThemeToken);
    const projected = projection.overrides.map(override => override.token);

    expect(projection.tokens).toEqual(preset);
    expect(new Set(projected)).toEqual(new Set(canonical));
    expect(new Set(projected).size).toBe(canonical.length);
  });
});
