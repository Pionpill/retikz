import type { IRScene, ResolvedTheme } from '@retikz/core';

import { compileToScene, resolveCoreThemeColors, ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import type { IRPlotSpec } from '../../src';

import {
  lowerPlots,
  PlotSpecSchema,
  PlotThemeToken,
  PlotThemeTokenDefinition,
  PlotThemeTokenSource,
  resolvePlotTheme,
} from '../../src';

const rows = [
  { x: 0, y: 1, city: 'A' },
  { x: 1, y: 2, city: 'B' },
];

const baseSpec = (override: Partial<IRPlotSpec> = {}): IRPlotSpec =>
  PlotSpecSchema.parse({
    namespace: 'plot',
    type: 'plot',
    data: { reference: 'd' },
    scales: [
      { type: 'linear', name: 'x' },
      { type: 'linear', name: 'y' },
    ],
    coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
    marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
    ...override,
  });

const fillsOf = (value: unknown): Array<unknown> => {
  if (value === null || typeof value !== 'object') return [];
  const item = value as { fill?: unknown; children?: ReadonlyArray<unknown> };
  return [
    ...(Object.hasOwn(item, 'fill') ? [item.fill] : []),
    ...(item.children?.flatMap(child => fillsOf(child)) ?? []),
  ];
};

const completeTheme = (overrides: Partial<ResolvedTheme> = {}): ResolvedTheme => ({
  style: ThemeStyle.Neutral,
  mode: ThemeMode.Light,
  tokens: {},
  colors: resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
  ...overrides,
});

describe('Plot inherited Theme token cascade', () => {
  it('uses shared, inherited, local, colors, and plotTheme layers in order', () => {
    const result = resolvePlotTheme(
      completeTheme({
        colors: {
          ...resolveCoreThemeColors(ThemeStyle.Neutral, ThemeMode.Light),
          categorical: ['#shared'],
        },
        tokens: {
          plot: {
            [PlotThemeToken.PlotPaletteSequential]: 'magma',
            [PlotThemeToken.PlotPaletteSeries]: ['#inherited'],
          },
        },
      }),
      {
        plotThemeTokens: {
          [PlotThemeToken.PlotPaletteCategorical]: ['#local'],
          [PlotThemeToken.PlotPaletteSeries]: ['#local'],
        },
        colors: ['#colors'],
        plotTheme: { palette: { series: ['#native'] } },
      },
    );

    expect(result.palette.categorical).toEqual(['#colors']);
    expect(result.palette.series).toEqual(['#native']);
    expect(result.palette.sector).toEqual(['#colors']);
    expect(result.palette.sequential).toBe('magma');
    expect(result.tokenSources.find(source => source.token === PlotThemeToken.PlotPaletteSequential)).toMatchObject({
      kind: PlotThemeTokenSource.Inherited,
      path: '$theme/tokens/plot/plot.palette.sequential',
    });
    expect(result.tokenSources.find(source => source.token === PlotThemeToken.PlotPaletteCategorical)).toMatchObject({
      kind: PlotThemeTokenSource.Colors,
      path: '$spec/colors',
    });
    expect(result.tokenSources.find(source => source.token === PlotThemeToken.PlotPaletteSeries)).toMatchObject({
      kind: PlotThemeTokenSource.PlotTheme,
      path: '$spec/plotTheme/palette/series',
    });
  });

  it('inherits Plot tokens through Core scope context and requires explicit owner definition', () => {
    const scene: IRScene = {
      version: 1,
      type: 'scene',
      theme: {
        tokens: {
          plot: { [PlotThemeToken.PlotSurfaceFill]: '#scene-fill' },
        },
      },
      children: [
        {
          type: 'scope',
          theme: { tokens: { plot: { [PlotThemeToken.PlotSurfaceFill]: '#scope-fill' } } },
          children: [baseSpec()],
        },
      ],
    };

    expect(() =>
      compileToScene(scene, {
        composites: lowerPlots({ d: rows }),
      }),
    ).toThrow(/unknown Theme token namespace "plot"/i);

    const compiled = compileToScene(scene, {
      composites: lowerPlots({ d: rows }),
      themeTokenDefinitions: [PlotThemeTokenDefinition],
    }).scene;

    const fills = compiled.primitives.flatMap(primitive => fillsOf(primitive));
    expect(fills).toContain('#scope-fill');
    expect(fills).not.toContain('#scene-fill');
  });

  it('does not expose mutable shared or inherited palette arrays', () => {
    const effectiveTheme = completeTheme({
      tokens: { plot: { [PlotThemeToken.PlotPaletteSeries]: ['#inherited'] } },
    });
    const input = { plotThemeTokens: { [PlotThemeToken.PlotPaletteSeries]: ['#local'] } };
    const result = resolvePlotTheme(effectiveTheme, input);

    result.palette.series[0] = '#changed';
    expect(input.plotThemeTokens[PlotThemeToken.PlotPaletteSeries]).toEqual(['#local']);
    expect(effectiveTheme.tokens.plot[PlotThemeToken.PlotPaletteSeries]).toEqual(['#inherited']);
  });
});
