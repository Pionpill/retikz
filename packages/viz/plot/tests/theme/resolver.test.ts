import type { ResolvedTheme, ThemeModeValue } from '@retikz/core';

import { resolveDefaultCoreThemeColors, ThemeMode, ThemeTokenSource } from '@retikz/core';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';

import type { IRPlot } from '../../src';

import * as plot from '../../src';
import { getDefaultPlotThemePreset } from '../../src/providers/theme';
import { applyPlotThemeToTokens, plotThemeFromTokens, resolvePlotAxisThemeTokens } from '../../src/resolve/theme';
import { PlotThemeResolutionSchema, PlotThemeToken, PlotThemeTokenResolutionSchema } from '../../src/schemas';

type PlotThemeResolution = {
  style: ResolvedTheme['style'];
  mode: ResolvedTheme['mode'];
  tokens: Record<string, unknown>;
  tokenSources: Array<{ token: string; kind: string; path: string }>;
  tokenRules: Array<{
    rule: NonNullable<IRPlot['plotThemeTokenRules']>[number];
    kind: string;
    path: string;
  }>;
  authoredOverrides: Array<{ kind: string; path: string }>;
  plotTheme: IRPlot['plotTheme'];
  palette: {
    categorical: Array<string>;
    series: Array<string>;
    sector: Array<string>;
    sequential: string;
    diverging: string;
    shape: Array<string | { type: string; params?: Record<string, unknown> }>;
  };
};

type ResolvePlotTheme = (
  effectiveTheme: ResolvedTheme,
  input?: Pick<IRPlot, 'plotThemeTokens' | 'plotThemeTokenRules' | 'plotTheme'>,
  plotThemeStyles?: ReadonlyArray<unknown>,
) => PlotThemeResolution;

const themeOf = (style: string | undefined, mode: ThemeModeValue): ResolvedTheme => ({
  ...(style === undefined ? {} : { style }),
  mode,
  colors: resolveDefaultCoreThemeColors(mode),
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
    expect(define).toBeTypeOf('function');
    const definition = define?.({
      name: 'brand',
      resolve: () => ({
        tokens: {
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
          semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706', guide: '#6b7280' },
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
    expect(sourceOf(result, PlotThemeToken.PlotAreaFill)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$default/light/plot.area.fill',
    });
  });

  it('拒绝缺少或重名 definition，并把外部 style 的 undefined token 当作省略', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const brand = plot.definePlotThemeStyle({ name: 'brand', resolve: () => ({}) });
    const sparseTokens = { [PlotThemeToken.AxisGridIncludeDomain]: false };
    Object.defineProperty(sparseTokens, PlotThemeToken.AxisGridIncludeDomain, {
      enumerable: true,
      value: undefined,
    });
    const sparseRuleTokens = {
      [PlotThemeToken.AxisGridEnabled]: false,
      [PlotThemeToken.AxisGridIncludeDomain]: false,
    };
    Object.defineProperty(sparseRuleTokens, PlotThemeToken.AxisGridIncludeDomain, {
      enumerable: true,
      value: undefined,
    });
    const sparseBrand = plot.definePlotThemeStyle({
      name: 'sparse-brand',
      resolve: () => ({
        tokens: sparseTokens,
        tokenRules: [{ select: { dimension: 'x' }, tokens: sparseRuleTokens }],
      }),
    });

    expect(() =>
      resolve(
        {
          style: 'brand',
          mode: ThemeMode.Light,
          colors: {
            semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706', guide: '#6b7280' },
            categorical: ['#brand'],
          },
        },
        {},
      ),
    ).toThrow(/Plot theme style 'brand' is not registered/);
    expect(() =>
      resolve(
        {
          mode: ThemeMode.Light,
          colors: {
            semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706', guide: '#6b7280' },
            categorical: ['#brand'],
          },
        },
        {},
        [brand, brand],
      ),
    ).toThrow(/Plot theme style 'brand' is already registered/);
    const sparseResult = resolve(themeOf('sparse-brand', ThemeMode.Light), {}, [sparseBrand]);
    expect(sparseResult.tokens[PlotThemeToken.AxisGridIncludeDomain]).toBe(false);
    expect(sourceOf(sparseResult, PlotThemeToken.AxisGridIncludeDomain)).toMatchObject({
      path: '$default/light/axis.grid.includeDomain',
    });
    expect(sparseResult.tokenRules.at(-1)).toMatchObject({
      path: '$style/sparse-brand/light/tokenRules/0',
      rule: {
        tokens: { [PlotThemeToken.AxisGridEnabled]: false },
      },
    });
    expect(sparseResult.tokenRules.at(-1)?.rule.tokens).not.toHaveProperty(PlotThemeToken.AxisGridIncludeDomain);

    const unknownTokens = { [PlotThemeToken.AxisGridEnabled]: false };
    Object.defineProperty(unknownTokens, 'unknown.token', { enumerable: true, value: undefined });
    const unknownRuleTokens = { [PlotThemeToken.AxisGridEnabled]: false };
    Object.defineProperty(unknownRuleTokens, 'unknown.rule.token', { enumerable: true, value: undefined });
    const unknownStyle = plot.definePlotThemeStyle({
      name: 'unknown-style-token',
      resolve: () => ({ tokens: unknownTokens }),
    });
    const unknownRuleStyle = plot.definePlotThemeStyle({
      name: 'unknown-rule-token',
      resolve: () => ({ tokenRules: [{ select: { dimension: 'x' }, tokens: unknownRuleTokens }] }),
    });

    expect(() => resolve(themeOf(unknownStyle.name, ThemeMode.Light), {}, [unknownStyle])).toThrow(/unknown/i);
    expect(() => resolve(themeOf(unknownRuleStyle.name, ThemeMode.Light), {}, [unknownRuleStyle])).toThrow(
      /unrecognized|unknown/i,
    );
  });

  it('拒绝外部 style definition 的非法顶层输出，同时把已知顶层 undefined 当作省略', () => {
    class EmptyStyleOutput {}
    class TickMarkOutput {
      readonly kind = 'circle';
      readonly size = 5;
    }

    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const sparseOutput = {};
    Object.defineProperties(sparseOutput, {
      tokens: { enumerable: true, value: undefined },
      tokenRules: { enumerable: true, value: undefined },
    });
    const sparseStyle = { name: 'sparse-output', resolve: () => sparseOutput };
    const sparseResult = resolve(themeOf(sparseStyle.name, ThemeMode.Light), {}, [sparseStyle]);

    expect(sparseResult.tokens[PlotThemeToken.PlotAreaFill]).toBe(
      getDefaultPlotThemePreset(ThemeMode.Light)[PlotThemeToken.PlotAreaFill],
    );
    expect(sparseResult.tokenRules.map(source => source.path)).toEqual(['$default/light/tokenRules/0']);

    const unknownOutput = {};
    Object.defineProperty(unknownOutput, 'unknown', { enumerable: true, value: undefined });
    const getterOutput = Object.defineProperty({}, 'tokens', {
      enumerable: true,
      get: () => ({ [PlotThemeToken.PlotAreaFill]: '#ffffff' }),
    });
    const symbolOutput = { tokens: {}, [Symbol('metadata')]: true };
    const tokenRulesWithExtra = [{ select: { dimension: 'x' }, tokens: { [PlotThemeToken.AxisGridEnabled]: false } }];
    Object.defineProperty(tokenRulesWithExtra, 'extra', { enumerable: true, value: true });
    const cyclicParams: Record<string, unknown> = {};
    cyclicParams.self = cyclicParams;
    const invalidStyles = [
      { name: 'null-output', resolve: () => null },
      { name: 'undefined-output', resolve: () => undefined },
      { name: 'primitive-output', resolve: () => 42 },
      { name: 'unknown-output', resolve: () => unknownOutput },
      { name: 'null-tokens', resolve: () => ({ tokens: null }) },
      { name: 'null-token-rules', resolve: () => ({ tokenRules: null }) },
      { name: 'date-output', resolve: () => new Date(0) },
      { name: 'class-output', resolve: () => new EmptyStyleOutput() },
      { name: 'promise-output', resolve: () => Promise.resolve({}) },
      { name: 'date-tokens', resolve: () => ({ tokens: new Date(0) }) },
      { name: 'class-tokens', resolve: () => ({ tokens: new EmptyStyleOutput() }) },
      { name: 'promise-tokens', resolve: () => ({ tokens: Promise.resolve({}) }) },
      {
        name: 'class-token-value',
        resolve: () => ({ tokens: { [PlotThemeToken.AxisTickMark]: new TickMarkOutput() } }),
      },
      {
        name: 'date-rule-tokens',
        resolve: () => ({ tokenRules: [{ select: { dimension: 'x' }, tokens: new Date(0) }] }),
      },
      {
        name: 'class-rule-tokens',
        resolve: () => ({ tokenRules: [{ select: { dimension: 'x' }, tokens: new EmptyStyleOutput() }] }),
      },
      {
        name: 'promise-rule-tokens',
        resolve: () => ({ tokenRules: [{ select: { dimension: 'x' }, tokens: Promise.resolve({}) }] }),
      },
      { name: 'getter-output', resolve: () => getterOutput },
      { name: 'symbol-output', resolve: () => symbolOutput },
      { name: 'array-extra-output', resolve: () => ({ tokenRules: tokenRulesWithExtra }) },
      {
        name: 'cyclic-token-value',
        resolve: () => ({
          tokens: { [PlotThemeToken.PlotPaletteShape]: [{ type: 'polygon', params: cyclicParams }] },
        }),
      },
    ];

    for (const style of invalidStyles) {
      expect(() => resolve(themeOf(style.name, ThemeMode.Light), {}, [style]), style.name).toThrowError(
        expect.objectContaining({
          code: plot.RetikzPlotErrorCode.Default,
          cause: expect.any(ZodError),
        }),
      );
    }
  });

  it('保留外部 style definition callback 抛出的原始 cause', () => {
    const cause = new Error('custom Plot style failed');
    const style = plot.definePlotThemeStyle({
      name: 'throwing-style',
      resolve: () => {
        throw cause;
      },
    });

    expect(() => plot.resolvePlotTheme(themeOf(style.name, ThemeMode.Light), {}, [style])).toThrowError(
      expect.objectContaining({
        code: plot.RetikzPlotErrorCode.Default,
        cause,
      }),
    );
  });

  it('在读取 Array 子类方法前拒绝外部 style token rules', () => {
    let mapReadCount = 0;
    class TokenRuleArray extends Array<unknown> {}
    Object.defineProperty(TokenRuleArray.prototype, 'map', {
      configurable: true,
      get: () => {
        mapReadCount += 1;
        return Array.prototype.map;
      },
    });
    const tokenRules = new TokenRuleArray({
      select: { dimension: 'x' },
      tokens: { [PlotThemeToken.AxisGridEnabled]: false },
    });
    const style = { name: 'array-subclass-rules', resolve: () => ({ tokenRules }) };

    expect(() =>
      Reflect.apply(plot.resolvePlotTheme, undefined, [themeOf(style.name, ThemeMode.Light), {}, [style]]),
    ).toThrowError(
      expect.objectContaining({
        code: plot.RetikzPlotErrorCode.Default,
        cause: expect.any(ZodError),
      }),
    );
    expect(mapReadCount).toBe(0);
  });

  it('在默认 Axis rules 后追加仅含 rules 的自定义 style', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const definition = plot.definePlotThemeStyle({
      name: 'brand-rules',
      resolve: () => ({
        tokenRules: [
          {
            select: { dimension: 'x' },
            tokens: { [PlotThemeToken.AxisTitlePadding]: 20 },
          },
        ],
      }),
    });
    const result = resolve(themeOf(definition.name, ThemeMode.Light), {}, [definition]);

    expect(result.tokens[PlotThemeToken.AxisTitlePadding]).toBe(12);
    expect(sourceOf(result, PlotThemeToken.AxisTitlePadding)).toMatchObject({
      path: '$default/light/axis.title.padding',
    });
    expect(result.tokenRules.map(record => record.path)).toEqual([
      '$default/light/tokenRules/0',
      '$style/brand-rules/light/tokenRules/0',
    ]);
  });

  it('为默认 baseline 的两个 mode 提供独立完整 preset', () => {
    const getPreset = (plot as Record<string, unknown>).getDefaultPlotThemePreset as
      | ((mode: ResolvedTheme['mode']) => unknown)
      | undefined;

    expect(getPreset).toBeDefined();
    for (const mode of Object.values(ThemeMode)) {
      const preset = getPreset?.(mode);
      expect(PlotThemeTokenResolutionSchema.parse(preset)).toEqual(preset);
      expect((preset as Record<string, unknown>)[PlotThemeToken.AxisTitleEnabled]).toBe(true);
      expect((preset as Record<string, unknown>)[PlotThemeToken.AxisTitlePadding]).toBe(12);
      expect((preset as Record<string, unknown>)[PlotThemeToken.AxisGridIncludeDomain]).toBe(false);

      const incomplete = structuredClone(preset) as Record<string, unknown>;
      delete incomplete[PlotThemeToken.AxisGridIncludeDomain];
      expect(PlotThemeTokenResolutionSchema.safeParse(incomplete).success).toBe(false);
    }
  });

  it('只让默认 baseline 的 x/y Axis rule 默认包含 grid domain endpoints', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const resolution = resolve(themeOf(undefined, ThemeMode.Light)) as Parameters<typeof resolvePlotAxisThemeTokens>[0];
    for (const dimension of ['x', 'y']) {
      const tokens = resolvePlotAxisThemeTokens(resolution, dimension);
      expect(tokens[PlotThemeToken.AxisGridIncludeDomain]).toBe(true);
    }
  });

  it('让 style 全局 token 覆盖默认 Axis rule', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const definition = plot.definePlotThemeStyle({
      name: 'brand-no-grid',
      resolve: () => ({ tokens: { [PlotThemeToken.AxisGridEnabled]: false } }),
    });
    const resolution = resolve(themeOf(definition.name, ThemeMode.Light), {}, [definition]) as Parameters<
      typeof resolvePlotAxisThemeTokens
    >[0];

    expect(resolvePlotAxisThemeTokens(resolution, 'x')[PlotThemeToken.AxisGridEnabled]).toBe(false);
    expect(resolvePlotAxisThemeTokens(resolution, 'y')[PlotThemeToken.AxisGridEnabled]).toBe(false);
  });

  it('让 Axis title padding 依次接受全局 token、dimension rule 与 native theme 覆盖', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const globalAndRule = resolve(themeOf(undefined, ThemeMode.Light), {
      plotThemeTokens: { [PlotThemeToken.AxisTitlePadding]: 8 },
      plotThemeTokenRules: [
        {
          select: { dimension: 'x' },
          tokens: { [PlotThemeToken.AxisTitlePadding]: 10 },
        },
      ],
    });
    const resolution = globalAndRule as Parameters<typeof resolvePlotAxisThemeTokens>[0];

    expect(globalAndRule.tokens[PlotThemeToken.AxisTitlePadding]).toBe(8);
    expect(globalAndRule.plotTheme?.axis?.title).toMatchObject({ padding: 8 });
    expect(resolvePlotAxisThemeTokens(resolution, 'x')[PlotThemeToken.AxisTitlePadding]).toBe(10);
    expect(resolvePlotAxisThemeTokens(resolution, 'y')[PlotThemeToken.AxisTitlePadding]).toBe(8);
    expect(sourceOf(globalAndRule, PlotThemeToken.AxisTitlePadding)).toMatchObject({
      path: '$spec/plotThemeTokens/axis.title.padding',
    });

    const native = resolve(themeOf(undefined, ThemeMode.Light), {
      plotThemeTokens: { [PlotThemeToken.AxisTitlePadding]: 8 },
      plotThemeTokenRules: [
        {
          select: { dimension: 'x' },
          tokens: { [PlotThemeToken.AxisTitlePadding]: 10 },
        },
      ],
      plotTheme: { axis: { title: { padding: 12 } } },
    });
    const nativeResolution = native as Parameters<typeof resolvePlotAxisThemeTokens>[0];

    expect(native.tokens[PlotThemeToken.AxisTitlePadding]).toBe(12);
    expect(resolvePlotAxisThemeTokens(nativeResolution, 'x')[PlotThemeToken.AxisTitlePadding]).toBe(12);
    expect(sourceOf(native, PlotThemeToken.AxisTitlePadding)).toMatchObject({
      path: '$spec/plotTheme/axis/title/padding',
    });
  });

  it('让内建 Plot definition 从 effective Core theme 构造 categorical baseline', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const effectiveTheme: ResolvedTheme = {
      ...themeOf(undefined, ThemeMode.Dark),
      colors: {
        semantic: { error: '#dc2626', success: '#16a34a', warning: '#d97706', guide: '#6b7280' },
        categorical: ['#effective-core'],
      },
    };
    const result = resolve(effectiveTheme);

    expect(sourceOf(result, PlotThemeToken.PlotAreaFill)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$default/dark/plot.area.fill',
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
        path: `$default/dark/${token}`,
      });
    }
  });

  it('按 effective Theme、token、native theme 顺序解析并记录来源', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(undefined, ThemeMode.Dark), {
      plotThemeTokens: {
        [PlotThemeToken.PlotAreaFill]: '#111111',
        [PlotThemeToken.PlotPaletteCategorical]: ['#token-categorical'],
        [PlotThemeToken.PlotPaletteSeries]: ['#token'],
        [PlotThemeToken.PlotPaletteShape]: ['circle', 'cross'],
      },
      plotTheme: {
        plotArea: { fill: '#native-area' },
        typography: { font: { family: 'serif' } },
        palette: { series: ['#theme'], shape: [{ type: 'polygon', params: { sides: 5 } }] },
      },
    });

    expect(result.style).toBeUndefined();
    expect(result.mode).toBe(ThemeMode.Dark);
    expect(result.tokens[PlotThemeToken.PlotAreaFill]).toBe('#native-area');
    expect(result.tokens[PlotThemeToken.PlotPaletteCategorical]).toEqual(['#token-categorical']);
    expect(result.tokens[PlotThemeToken.PlotPaletteSeries]).toEqual(['#theme']);
    expect(result.plotTheme?.typography?.font?.family).toBe('serif');
    expect(result.palette.series).toEqual(['#theme']);
    expect(result.palette.shape).toEqual([{ type: 'polygon', params: { sides: 5 } }]);
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
    expect(sourceOf(result, PlotThemeToken.PlotPaletteShape)).toMatchObject({
      kind: ThemeTokenSource.Local,
      path: '$spec/plotTheme/palette/shape',
    });
    expect(result.authoredOverrides).toEqual([{ kind: ThemeTokenSource.Local, path: '$spec/plotTheme' }]);
  });

  it('返回深克隆、JSON-safe 且确定的结果', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const input = { plotThemeTokens: { [PlotThemeToken.PlotPaletteSeries]: ['#2563eb'] } };
    const first = resolve(themeOf(undefined, ThemeMode.Light), input);
    const second = resolve(themeOf(undefined, ThemeMode.Light), input);

    expect(first).toEqual(second);
    expect(JSON.parse(JSON.stringify(first))).toEqual(first);
    expect(first).not.toBe(second);
    expect(first.tokens).not.toBe(second.tokens);
    expect(first.palette.series).not.toBe(input.plotThemeTokens[PlotThemeToken.PlotPaletteSeries]);
  });

  it('inspection schema 只接受二元来源与唯一 authored override path', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(undefined, ThemeMode.Light), {
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

    const withLocalRule = resolve(themeOf(undefined, ThemeMode.Light), {
      plotThemeTokenRules: [
        {
          select: { dimension: 'x' },
          tokens: { [PlotThemeToken.AxisTitlePadding]: 20 },
        },
      ],
    });
    expect(
      PlotThemeResolutionSchema.safeParse({
        ...withLocalRule,
        tokenRules: withLocalRule.tokenRules.slice(1),
      }).success,
    ).toBe(false);
  });

  it('native theme 对数组、false 与不同 discriminator 对象做完整替换', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(undefined, ThemeMode.Light), {
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
    const result = resolve(themeOf(undefined, ThemeMode.Light), {
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
          select: { dimension: ['x', 'y'] },
          tokens: {
            [PlotThemeToken.AxisGridEnabled]: true,
            [PlotThemeToken.AxisGridIncludeDomain]: true,
          },
        },
        kind: ThemeTokenSource.Local,
        path: '$default/light/tokenRules/0',
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

  it('把 native grid 投影到五个基础 token 并只标记 authored 字段', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(undefined, ThemeMode.Light), {
      plotTheme: {
        axis: {
          grid: {
            stroke: '#cbd5e1',
            dashPattern: [4, 2],
            includeDomain: true,
          },
        },
      },
    });

    expect(result.plotTheme?.axis?.grid).toMatchObject({
      stroke: '#cbd5e1',
      dashPattern: [4, 2],
      includeDomain: true,
    });
    expect(result.tokens[PlotThemeToken.AxisGridEnabled]).toBe(true);
    expect(result.tokens[PlotThemeToken.AxisGridStroke]).toBe('#cbd5e1');
    expect(result.tokens[PlotThemeToken.AxisGridIncludeDomain]).toBe(true);
    expect(sourceOf(result, PlotThemeToken.AxisGridEnabled)).toMatchObject({
      path: '$spec/plotTheme/axis/grid',
    });
    expect(sourceOf(result, PlotThemeToken.AxisGridStroke)).toMatchObject({
      path: '$spec/plotTheme/axis/grid/stroke',
    });
    expect(sourceOf(result, PlotThemeToken.AxisGridIncludeDomain)).toMatchObject({
      path: '$spec/plotTheme/axis/grid/includeDomain',
    });
    expect(sourceOf(result, PlotThemeToken.AxisGridStrokeWidth)).toMatchObject({
      path: '$default/light/axis.grid.strokeWidth',
    });
  });

  it('保留 native theme 中没有对应 token 的合法字段', () => {
    const resolve = plot.resolvePlotTheme as unknown as ResolvePlotTheme;
    const result = resolve(themeOf(undefined, ThemeMode.Light), {
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
    const preset = getDefaultPlotThemePreset(ThemeMode.Light);
    const enabled = PlotThemeTokenResolutionSchema.parse({
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
