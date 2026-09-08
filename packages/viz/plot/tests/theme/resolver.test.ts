import type { ResolvedTheme } from '@retikz/core';

import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { PlotThemeStyleDefinition } from '../../src/contract';

import * as plot from '../../src';
import { getNeutralPlotDefaults } from '../../src/providers/theme';
import { resolvePlotAxisDefaults } from '../../src/resolve/theme';
import { PlotDefaultsSchema, PlotThemeResolutionSchema } from '../../src/schemas';

const themeOf = (style: string | undefined, mode: ResolvedTheme['mode']): ResolvedTheme => ({
  ...(style === undefined ? {} : { style }),
  mode,
  colors: resolveDefaultCoreThemeColors(mode),
});

describe('Plot defaults resolver', () => {
  it('让 style defaults 高于 Core shared categorical colors，并记录实际来源 layer', () => {
    const style = plot.definePlotThemeStyle({
      name: 'brand',
      resolve: () => ({
        defaults: {
          palette: {
            categorical: ['#brand-categorical'],
            series: ['#brand-series'],
          },
        },
      }),
    });

    const result = plot.resolvePlotTheme(themeOf(style.name, ThemeMode.Light), {}, [style]);

    expect(result.palette).toMatchObject({
      categorical: ['#brand-categorical'],
      series: ['#brand-series'],
    });
    expect(result.layers).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'neutral', path: '$default/light' }),
        expect.objectContaining({ kind: 'style', path: '$style/brand/light' }),
      ]),
    );
    expect(result.layers.find(layer => layer.kind === 'style')?.defaults).toEqual({
      palette: { categorical: ['#brand-categorical'], series: ['#brand-series'] },
    });
  });

  it('按 Neutral、style、Source 顺序合并 defaults，并保留 palette 数组整体替换', () => {
    const style = plot.definePlotThemeStyle({
      name: 'brand',
      resolve: () => ({
        defaults: {
          typography: { font: { family: 'serif', size: 14 }, textColor: '#334155' },
          palette: { series: ['#style-series'] },
        },
      }),
    });
    const result = plot.resolvePlotTheme(
      themeOf(style.name, ThemeMode.Light),
      {
        plotDefaults: {
          typography: { font: { family: 'monospace' } },
          palette: { series: ['#source-series'] },
        },
      },
      [style],
    );

    expect(result.defaults.typography).toEqual({ font: { family: 'monospace' }, textColor: '#334155' });
    expect(result.palette.series).toEqual(['#source-series']);
    expect(result.layers.map(layer => layer.path)).toEqual(['$default/light', '$style/brand/light', '$spec']);
  });

  it('按 rule source 顺序追加并可按 dimension 重放，后声明规则优先', () => {
    const style = plot.definePlotThemeStyle({
      name: 'brand-rules',
      resolve: () => ({
        rules: [{ select: { dimension: 'x' }, axis: { line: { stroke: '#style-line' } } }],
      }),
    });
    const result = plot.resolvePlotTheme(
      themeOf(style.name, ThemeMode.Light),
      {
        plotRules: [
          { select: { dimension: ['x', 'y'] }, axis: { line: { stroke: '#source-line' } } },
          { select: { dimension: 'x' }, axis: { grid: false } },
        ],
      },
      [style],
    );

    expect(result.rules.map(source => source.path)).toEqual([
      '$default/light/plotRules/0',
      '$style/brand-rules/light/plotRules/0',
      '$spec/plotRules/0',
      '$spec/plotRules/1',
    ]);
    expect(result.rules.every(source => source.sourcePath.length > 0)).toBe(true);

    const x = resolvePlotAxisDefaults(result, 'x');
    const y = resolvePlotAxisDefaults(result, 'y');
    expect(x.axis?.line).toMatchObject({ stroke: '#source-line' });
    expect(x.axis?.grid).toBe(false);
    expect(y.axis?.line).toMatchObject({ stroke: '#source-line' });
    expect(y.axis?.grid).toMatchObject({ includeDomain: true });
  });

  it('默认 preset 使用当前 mode 的 Core categorical palette，并保持 Source shape', () => {
    for (const mode of Object.values(ThemeMode)) {
      const defaults = getNeutralPlotDefaults(mode, resolveDefaultCoreThemeColors(mode).categorical);
      expect(defaults.palette?.categorical).toEqual(resolveDefaultCoreThemeColors(mode).categorical);
      expect(defaults.palette?.series).toEqual(resolveDefaultCoreThemeColors(mode).categorical);
      expect(defaults.axis?.grid).toBe(false);
      expect(PlotThemeResolutionSchema.shape.defaults.safeParse(defaults).success).toBe(true);
    }
  });

  it('未知 style、重复 definition 与 callback cause 均 fail loud', () => {
    expect(() => plot.resolvePlotTheme(themeOf('missing', ThemeMode.Light))).toThrow(
      /Plot theme style 'missing' is not registered/,
    );

    const duplicate = plot.definePlotThemeStyle({ name: 'duplicate', resolve: () => ({}) });
    expect(() => plot.resolvePlotTheme(themeOf('duplicate', ThemeMode.Light), {}, [duplicate, duplicate])).toThrow(
      /already registered/,
    );

    const cause = new Error('custom Plot style failed');
    const throwing: PlotThemeStyleDefinition = {
      name: 'throwing',
      resolve: () => {
        throw cause;
      },
    };
    expect(() => plot.resolvePlotTheme(themeOf(throwing.name, ThemeMode.Light), {}, [throwing])).toThrowError(
      expect.objectContaining({ cause }),
    );
  });

  it('不接受未声明的 base inheritance 入口，避免主题 base cycle', () => {
    expect(PlotDefaultsSchema.safeParse({ base: 'base-cycle' }).success).toBe(false);
  });
});
