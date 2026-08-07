import { ThemeMode, ThemeStyle } from '@retikz/core';
import { LayoutContainerBoxSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import {
  ChartResolvedStyleTokensSchema,
  ChartStyleSurfaceSchema,
  ChartStyleToken,
  ChartStyleTokenOverridesSchema,
} from '../../src/style';

describe('Chart style schema', () => {
  it('只冻结 Chart-owned canonical token，不复制 Plot token', () => {
    expect(Object.values(ThemeStyle)).toEqual(['neutral', 'academic', 'vibrant', 'clean']);
    expect(Object.values(ThemeMode)).toEqual(['light', 'dark']);
    expect(Object.values(ChartStyleToken)).toHaveLength(37);
    expect(new Set(Object.values(ChartStyleToken)).size).toBe(37);
    expect(Object.values(ChartStyleToken)).toContain('chart.canvas.fill');
    expect(Object.values(ChartStyleToken)).toContain('chart.axis.enabled');
    expect(Object.values(ChartStyleToken)).not.toContain('axis.tick.mark');
    expect(Object.values(ChartStyleToken)).not.toContain('data.palette.diverging');
  });

  it('从 authoring surface 删除 spec-local style/mode', () => {
    expect(ChartStyleSurfaceSchema.safeParse({ style: ThemeStyle.Clean }).success).toBe(false);
    expect(ChartStyleSurfaceSchema.safeParse({ themeMode: ThemeMode.Dark }).success).toBe(false);
    expect(ChartStyleSurfaceSchema.parse({})).toEqual({});
  });

  it('为每个公开 token 提供字段级 schema 描述', () => {
    const descriptions = Object.values(ChartStyleToken).map(
      token => ChartResolvedStyleTokensSchema.shape[token].description,
    );
    const overrideDescriptions = Object.values(ChartStyleToken).map(
      token => ChartStyleTokenOverridesSchema.shape[token].unwrap().description,
    );
    expect(descriptions.every(description => typeof description === 'string' && description.length > 0)).toBe(true);
    expect(overrideDescriptions).toEqual(descriptions);
  });

  it('接受 strict flat Chart overrides 并拒绝 Plot key、旧 key 与非法 value', () => {
    const value = {
      'chart.axis.enabled': false,
      'chart.axis.grid.enabled': false,
      'chart.legend.enabled': true,
    };
    expect(ChartStyleTokenOverridesSchema.parse(value)).toEqual(value);
    expect(ChartStyleTokenOverridesSchema.safeParse({ 'axis.enabled': true }).success).toBe(false);
    expect(ChartStyleTokenOverridesSchema.safeParse({ 'plot.palette.series': ['#2563eb'] }).success).toBe(false);
    expect(ChartStyleTokenOverridesSchema.safeParse({ chart: { axis: { enabled: true } } }).success).toBe(false);
  });

  it('拒绝显式 undefined token override', () => {
    expect(
      ChartStyleSurfaceSchema.safeParse({
        chartThemeTokens: { [ChartStyleToken.ChartAxisEnabled]: undefined },
      }).success,
    ).toBe(false);
  });

  it('required map 缺少任意 canonical token 时 fail-loud', () => {
    expect(ChartResolvedStyleTokensSchema.safeParse({}).success).toBe(false);
  });

  it('复用 Standard padding 并原样接受 Plot token 转发面', () => {
    const padding = { x: 8, top: 12 };
    expect(ChartStyleTokenOverridesSchema.shape['chart.padding'].parse(padding)).toEqual(
      LayoutContainerBoxSchema.shape.padding.unwrap().parse(padding),
    );
    const surface = ChartStyleSurfaceSchema.parse({
      chartThemeTokens: { 'chart.padding': padding },
      plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
      colors: ['#111827', '#f97316'],
    });
    expect(JSON.parse(JSON.stringify(surface))).toEqual(surface);
  });
});
