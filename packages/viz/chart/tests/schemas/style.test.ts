import { LayoutContainerBoxSchema } from '@retikz/standard';
import { describe, expect, it } from 'vitest';

import {
  ChartResolvedStyleTokensSchema,
  ChartStyle,
  ChartStyleSurfaceSchema,
  ChartStyleToken,
  ChartStyleTokenOverridesSchema,
  ChartThemeMode,
} from '../../src/style';

describe('Chart style schema', () => {
  it('冻结四个 preset、两个 mode 与完整 canonical token 列表', () => {
    expect(Object.values(ChartStyle)).toEqual(['neutral', 'academic', 'vibrant', 'clean']);
    expect(Object.values(ChartThemeMode)).toEqual(['light', 'dark']);
    expect(Object.values(ChartStyleToken)).toHaveLength(75);
    expect(new Set(Object.values(ChartStyleToken)).size).toBe(75);
    expect(Object.values(ChartStyleToken)).toContain('chart.canvas.fill');
    expect(Object.values(ChartStyleToken)).toContain('axis.tick.mark');
    expect(Object.values(ChartStyleToken)).toContain('data.palette.diverging');
  });

  it('为每个公开 token 提供唯一的字段级 schema 描述', () => {
    const descriptions = Object.values(ChartStyleToken).map(
      token => ChartResolvedStyleTokensSchema.shape[token].description,
    );
    const overrideDescriptions = Object.values(ChartStyleToken).map(
      token => ChartStyleTokenOverridesSchema.shape[token].unwrap().description,
    );
    expect(descriptions.every(description => typeof description === 'string' && description.length > 0)).toBe(true);
    expect(new Set(descriptions).size).toBe(75);
    expect(overrideDescriptions).toEqual(descriptions);
  });

  it('接受 strict flat sparse overrides 并拒绝未知 key 与非法 value', () => {
    const value = {
      'axis.line.enabled': false,
      'axis.tick.mark': { kind: 'circle', size: 5, fill: '#fff', stroke: '#111827' },
      'data.palette.categorical': ['#2563eb', '#f97316'],
    };
    expect(ChartStyleTokenOverridesSchema.parse(value)).toEqual(value);
    expect(ChartStyleTokenOverridesSchema.safeParse({ 'axis.unknown': true }).success).toBe(false);
    expect(ChartStyleTokenOverridesSchema.safeParse({ 'axis.line.strokeWidth': -1 }).success).toBe(false);
    expect(ChartStyleTokenOverridesSchema.safeParse({ 'data.palette.categorical': [] }).success).toBe(false);
    expect(ChartStyleTokenOverridesSchema.safeParse({ axis: { enabled: true } }).success).toBe(false);
  });

  it('拒绝显式 undefined token override，避免合法输入在 resolver 阶段失败', () => {
    expect(
      ChartStyleSurfaceSchema.safeParse({
        styleTokens: { [ChartStyleToken.AxisEnabled]: undefined },
      }).success,
    ).toBe(false);
  });

  it('required map 缺少任意 canonical token 时 fail-loud', () => {
    expect(ChartResolvedStyleTokensSchema.safeParse({}).success).toBe(false);
  });

  it('复用 Standard padding contract 并保持 style surface JSON-safe', () => {
    const padding = { x: 8, top: 12 };
    expect(LayoutContainerBoxSchema.shape.padding.unwrap().parse(padding)).toEqual(padding);
    expect(ChartStyleTokenOverridesSchema.shape['chart.padding'].parse(padding)).toEqual(
      LayoutContainerBoxSchema.shape.padding.unwrap().parse(padding),
    );

    const surface = ChartStyleSurfaceSchema.parse({
      style: ChartStyle.Clean,
      themeMode: ChartThemeMode.Dark,
      styleTokens: { 'chart.padding': padding },
      colors: ['#111827', '#f97316'],
    });
    expect(JSON.parse(JSON.stringify(surface))).toEqual(surface);
  });
});
