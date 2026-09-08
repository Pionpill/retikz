import { resolveDefaultCoreThemeColors, ThemeMode } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { definePlotThemeStyle, resolvePlotTheme } from '../../src';

describe('Plot defaults inspection', () => {
  it('记录 Neutral、style、Source 的真实 defaults/rules/palette 来源', () => {
    const style = definePlotThemeStyle({
      name: 'inspection-style',
      resolve: () => ({
        defaults: { palette: { series: ['#style-series'] } },
        rules: [{ select: { dimension: 'y' }, axis: { line: { stroke: '#style-line' } } }],
      }),
    });
    const result = resolvePlotTheme(
      {
        style: style.name,
        mode: ThemeMode.Light,
        colors: resolveDefaultCoreThemeColors(ThemeMode.Light),
      },
      {
        plotDefaults: { palette: { categorical: ['#source-categorical'] } },
        plotRules: [{ select: { dimension: 'x' }, axis: { grid: false } }],
      },
      [style],
    );

    expect(result.layers.map(layer => layer.path)).toEqual([
      '$default/light',
      '$style/inspection-style/light',
      '$spec',
    ]);
    expect(result.layers.map(layer => layer.kind)).toEqual(['neutral', 'style', 'source']);
    expect(result.layers.find(layer => layer.kind === 'style')?.defaults).toEqual({
      palette: { series: ['#style-series'] },
    });
    expect(result.layers.find(layer => layer.kind === 'source')?.defaults).toEqual({
      palette: { categorical: ['#source-categorical'] },
    });
    expect(result.rules.map(rule => rule.path)).toEqual([
      '$default/light/plotRules/0',
      '$style/inspection-style/light/plotRules/0',
      '$spec/plotRules/0',
    ]);
    expect(result.palette).toMatchObject({
      categorical: ['#source-categorical'],
      series: ['#style-series'],
    });
    const serialized = JSON.stringify(result);
    expect(serialized).not.toContain('token');
    expect(serialized).not.toContain('sector');
  });
});
