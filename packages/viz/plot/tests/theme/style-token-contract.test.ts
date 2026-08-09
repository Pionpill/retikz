import { describe, expect, it } from 'vitest';

import * as plot from '../../src';
import {
  PlotResolvedThemeTokensSchema,
  PlotSpecSchema,
  PlotThemeToken,
  PlotThemeTokenOverridesSchema,
} from '../../src';

const baseSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'd' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [{ type: 'point', encoding: { x: { field: 'x' }, y: { field: 'y' } } }],
  guides: [],
} as const;

describe('Plot style token contract', () => {
  it('从 Plot 根入口公开 canonical token 与 sparse/required schema', () => {
    const api = plot as Record<string, unknown>;

    expect(api.PlotThemeToken).toBeDefined();
    expect(api.PlotThemeTokenOverridesSchema).toBeDefined();
    expect(api.PlotResolvedThemeTokensSchema).toBeDefined();
    expect('PlotThemeTokenSource' in api).toBe(false);
  });

  it('让 PlotSpec 接受 strict flat plotThemeTokens', () => {
    const parsed = PlotSpecSchema.safeParse({
      ...baseSpec,
      plotThemeTokens: {
        'plot.surface.fill': 'none',
        'plot.palette.series': ['#2563eb', '#f97316'],
      },
    });

    expect(parsed.success).toBe(true);
    expect(
      PlotSpecSchema.safeParse({
        ...baseSpec,
        plotThemeTokens: { plot: { surface: { fill: 'none' } } },
      }).success,
    ).toBe(false);
  });

  it('拒绝已删除的顶层 colors 调色板简写', () => {
    const result = PlotSpecSchema.safeParse({ ...baseSpec, colors: ['#2563eb', '#f97316'] });

    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: ['colors'] });
  });

  it('对未知 token、错误原子、显式 undefined 与空 palette 给出可定位失败', () => {
    const unknown = PlotThemeTokenOverridesSchema.safeParse({ 'chart.canvas.fill': '#ffffff' });
    expect(unknown.success).toBe(false);
    if (!unknown.success) {
      expect(unknown.error.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: ['chart.canvas.fill'] });
    }

    for (const [value, path] of [
      [{ [PlotThemeToken.AxisLineStrokeWidth]: -1 }, [PlotThemeToken.AxisLineStrokeWidth]],
      [{ [PlotThemeToken.PlotPaletteSeries]: [] }, [PlotThemeToken.PlotPaletteSeries]],
      [{ [PlotThemeToken.PlotSurfaceFill]: undefined }, [PlotThemeToken.PlotSurfaceFill]],
    ] as const) {
      const result = PlotThemeTokenOverridesSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some(issue => issue.path.join('.') === path.join('.'))).toBe(true);
    }
  });

  it('让 sparse 与 PlotSpec token 输入保持 JSON round-trip，并让 required map 拒绝缺项', () => {
    const plotThemeTokens = PlotThemeTokenOverridesSchema.parse({
      [PlotThemeToken.PlotSurfaceFill]: 'none',
      [PlotThemeToken.AxisTickMark]: { kind: 'circle', size: 5 },
      [PlotThemeToken.PlotPaletteSeries]: ['#2563eb', '#f97316'],
    });
    const parsed = PlotSpecSchema.parse({ ...baseSpec, plotThemeTokens });

    expect(JSON.parse(JSON.stringify(plotThemeTokens))).toEqual(plotThemeTokens);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(PlotResolvedThemeTokensSchema.safeParse(plotThemeTokens).success).toBe(false);
  });
});
