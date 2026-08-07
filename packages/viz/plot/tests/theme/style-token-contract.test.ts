import { describe, expect, it } from 'vitest';

import * as plot from '../../src';
import {
  PlotResolvedStyleTokensSchema,
  PlotSpecSchema,
  PlotStyleToken,
  PlotStyleTokenOverridesSchema,
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

    expect(api.PlotStyleToken).toBeDefined();
    expect(api.PlotStyleTokenOverridesSchema).toBeDefined();
    expect(api.PlotResolvedStyleTokensSchema).toBeDefined();
  });

  it('让 PlotSpec 接受 strict flat styleTokens', () => {
    const parsed = PlotSpecSchema.safeParse({
      ...baseSpec,
      styleTokens: {
        'plot.surface.fill': 'none',
        'plot.palette.series': ['#2563eb', '#f97316'],
      },
    });

    expect(parsed.success).toBe(true);
    expect(
      PlotSpecSchema.safeParse({
        ...baseSpec,
        styleTokens: { plot: { surface: { fill: 'none' } } },
      }).success,
    ).toBe(false);
  });

  it('对未知 token、错误原子、显式 undefined 与空 palette 给出可定位失败', () => {
    const unknown = PlotStyleTokenOverridesSchema.safeParse({ 'chart.canvas.fill': '#ffffff' });
    expect(unknown.success).toBe(false);
    if (!unknown.success) {
      expect(unknown.error.issues[0]).toMatchObject({ code: 'unrecognized_keys', keys: ['chart.canvas.fill'] });
    }

    for (const [value, path] of [
      [{ [PlotStyleToken.AxisLineStrokeWidth]: -1 }, [PlotStyleToken.AxisLineStrokeWidth]],
      [{ [PlotStyleToken.PlotPaletteSeries]: [] }, [PlotStyleToken.PlotPaletteSeries]],
      [{ [PlotStyleToken.PlotSurfaceFill]: undefined }, [PlotStyleToken.PlotSurfaceFill]],
    ] as const) {
      const result = PlotStyleTokenOverridesSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some(issue => issue.path.join('.') === path.join('.'))).toBe(true);
    }
  });

  it('让 sparse 与 PlotSpec token 输入保持 JSON round-trip，并让 required map 拒绝缺项', () => {
    const styleTokens = PlotStyleTokenOverridesSchema.parse({
      [PlotStyleToken.PlotSurfaceFill]: 'none',
      [PlotStyleToken.AxisTickMark]: { kind: 'circle', size: 5 },
      [PlotStyleToken.PlotPaletteSeries]: ['#2563eb', '#f97316'],
    });
    const parsed = PlotSpecSchema.parse({ ...baseSpec, styleTokens });

    expect(JSON.parse(JSON.stringify(styleTokens))).toEqual(styleTokens);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(PlotResolvedStyleTokensSchema.safeParse(styleTokens).success).toBe(false);
  });
});
