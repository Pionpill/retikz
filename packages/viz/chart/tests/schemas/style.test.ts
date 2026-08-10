import { ThemeMode, ThemeStyle } from '@retikz/core';
import { LayoutContainerBoxSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import {
  ChartResolvedThemeTokensSchema,
  ChartThemeSurfaceSchema,
  ChartThemeToken,
  ChartThemeTokenOverridesSchema,
} from '../../src/style';

describe('Chart style schema', () => {
  it('只冻结 Chart-owned canonical token，不复制 Plot token', () => {
    expect(Object.values(ThemeStyle)).toEqual(['neutral', 'academic', 'vibrant', 'clean']);
    expect(Object.values(ThemeMode)).toEqual(['light', 'dark']);
    expect(Object.values(ChartThemeToken)).toHaveLength(37);
    expect(new Set(Object.values(ChartThemeToken)).size).toBe(37);
    expect(Object.values(ChartThemeToken)).toContain('chart.canvas.fill');
    expect(Object.values(ChartThemeToken)).toContain('chart.axis.enabled');
    expect(Object.values(ChartThemeToken)).not.toContain('axis.tick.mark');
    expect(Object.values(ChartThemeToken)).not.toContain('data.palette.diverging');
  });

  it('从 authoring surface 删除 spec-local style/mode', () => {
    expect(ChartThemeSurfaceSchema.safeParse({ style: ThemeStyle.Clean }).success).toBe(false);
    expect(ChartThemeSurfaceSchema.safeParse({ themeMode: ThemeMode.Dark }).success).toBe(false);
    expect(ChartThemeSurfaceSchema.parse({})).toEqual({});
  });

  it('为每个公开 token 提供字段级 schema 描述', () => {
    const descriptions = Object.values(ChartThemeToken).map(
      token => ChartResolvedThemeTokensSchema.shape[token].description,
    );
    const overrideDescriptions = Object.values(ChartThemeToken).map(
      token => ChartThemeTokenOverridesSchema.shape[token].unwrap().description,
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
    expect(ChartThemeTokenOverridesSchema.parse(value)).toEqual(value);
    expect(ChartThemeTokenOverridesSchema.safeParse({ 'axis.enabled': true }).success).toBe(false);
    expect(ChartThemeTokenOverridesSchema.safeParse({ 'plot.palette.series': ['#2563eb'] }).success).toBe(false);
    expect(ChartThemeTokenOverridesSchema.safeParse({ chart: { axis: { enabled: true } } }).success).toBe(false);
  });

  it('拒绝显式 undefined token override', () => {
    expect(
      ChartThemeSurfaceSchema.safeParse({
        chartThemeTokens: { [ChartThemeToken.ChartAxisEnabled]: undefined },
      }).success,
    ).toBe(false);
  });

  it('required map 缺少任意 canonical token 时 fail-loud', () => {
    expect(ChartResolvedThemeTokensSchema.safeParse({}).success).toBe(false);
  });

  it('复用 Standard padding 并原样接受 Plot token 转发面', () => {
    const padding = { x: 8, top: 12 };
    expect(ChartThemeTokenOverridesSchema.shape['chart.padding'].parse(padding)).toEqual(
      LayoutContainerBoxSchema.shape.padding.unwrap().parse(padding),
    );
    const surface = ChartThemeSurfaceSchema.parse({
      chartThemeTokens: { 'chart.padding': padding },
      plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
      plotThemeTokenRules: [
        {
          select: { dimension: 'x' },
          tokens: { 'axis.grid.enabled': true },
        },
      ],
      plotTheme: { palette: { categorical: ['#111827', '#f97316'] } },
    });
    expect(JSON.parse(JSON.stringify(surface))).toEqual(surface);
    expect(ChartThemeSurfaceSchema.safeParse({ colors: ['#111827', '#f97316'] }).success).toBe(false);
  });
});
