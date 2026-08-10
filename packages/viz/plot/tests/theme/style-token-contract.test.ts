import { describe, expect, it } from 'vitest';

import * as plot from '../../src';
import {
  PlotResolvedThemeTokensSchema,
  PlotSpecSchema,
  PlotThemeSchema,
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
        'plot.area.fill': 'none',
        'plot.palette.series': ['#2563eb', '#f97316'],
      },
    });

    expect(parsed.success).toBe(true);
    expect(PlotThemeTokenOverridesSchema.safeParse({ 'plot.surface.fill': 'none' }).success).toBe(false);
    expect(Object.values(PlotThemeToken)).toContain('plot.area.fill');
    expect(Object.values(PlotThemeToken)).not.toContain('plot.surface.fill');
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
      [{ [PlotThemeToken.PlotAreaFill]: undefined }, [PlotThemeToken.PlotAreaFill]],
    ] as const) {
      const result = PlotThemeTokenOverridesSchema.safeParse(value);
      expect(result.success).toBe(false);
      if (!result.success)
        expect(result.error.issues.some(issue => issue.path.join('.') === path.join('.'))).toBe(true);
    }
  });

  it('拒绝已移除的 Plot presentation theme contract', () => {
    expect(PlotThemeTokenOverridesSchema.safeParse({ 'plot.label.foreground': '#111111' }).success).toBe(false);
    expect(PlotThemeTokenOverridesSchema.safeParse({ 'plot.label.font.size': 14 }).success).toBe(false);
    expect(PlotThemeSchema.safeParse({ labelText: { textColor: '#111111' } }).success).toBe(false);
    expect(Object.values(PlotThemeToken)).not.toContain('plot.label.foreground');
    expect(Object.values(PlotThemeToken)).not.toContain('plot.label.font.size');
    expect(plot.PlotLayerZIndex as Record<string, number>).not.toHaveProperty('PlotLabel');
  });

  it('保留五个可选 Plot theme 顶层成员', () => {
    expect(PlotThemeSchema.safeParse({}).success).toBe(true);
    expect(
      PlotThemeSchema.safeParse({
        plotArea: { fill: 'none' },
        typography: { textColor: 'currentColor' },
        axis: { line: false },
        legend: { swatchSize: 12 },
        palette: { categorical: ['#2563eb'] },
      }).success,
    ).toBe(true);
    expect(PlotThemeSchema.safeParse({ background: 'none' }).success).toBe(false);
    expect(PlotThemeSchema.safeParse({ plotArea: { background: 'none' } }).success).toBe(false);
  });

  it('让 sparse 与 PlotSpec token 输入保持 JSON round-trip，并让 required map 拒绝缺项', () => {
    const plotThemeTokens = PlotThemeTokenOverridesSchema.parse({
      [PlotThemeToken.PlotAreaFill]: 'none',
      [PlotThemeToken.AxisTickMark]: { kind: 'circle', size: 5 },
      [PlotThemeToken.PlotPaletteSeries]: ['#2563eb', '#f97316'],
    });
    const parsed = PlotSpecSchema.parse({ ...baseSpec, plotThemeTokens });

    expect(JSON.parse(JSON.stringify(plotThemeTokens))).toEqual(plotThemeTokens);
    expect(JSON.parse(JSON.stringify(parsed))).toEqual(parsed);
    expect(PlotResolvedThemeTokensSchema.safeParse(plotThemeTokens).success).toBe(false);
  });
});
