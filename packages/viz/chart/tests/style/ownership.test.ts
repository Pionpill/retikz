import { describe, expect, it } from 'vitest';

import { BubbleChartSpecSchema } from '../../src/families/scatter-points/bubble';
import { ConnectedScatterChartSpecSchema } from '../../src/families/scatter-points/connected-scatter';
import { ScatterChartSpecSchema } from '../../src/families/scatter-points/scatter';
import { ChartSharedSchema } from '../../src/schemas';

const base = {
  data: { reference: 'd' },
} as const;

describe('Chart theme token ownership', () => {
  it('删除 spec-local style/themeMode 并只接受 Chart-owned style token', () => {
    expect(ChartSharedSchema.safeParse({ ...base, style: 'clean' }).success).toBe(false);
    expect(ChartSharedSchema.safeParse({ ...base, themeMode: 'dark' }).success).toBe(false);
    expect(ChartSharedSchema.safeParse({ ...base, styleTokens: { 'chart.padding': 8 } }).success).toBe(false);
    expect(ChartSharedSchema.safeParse({ ...base, theme: { palette: {} } }).success).toBe(false);
    expect(
      ChartSharedSchema.safeParse({
        ...base,
        chartThemeTokens: {
          'chart.axis.enabled': false,
          'chart.axis.grid.enabled': false,
          'chart.legend.enabled': true,
        },
      }).success,
    ).toBe(true);
    expect(
      ChartSharedSchema.safeParse({ ...base, chartThemeTokens: { 'plot.palette.series': ['#2563eb'] } }).success,
    ).toBe(false);
  });

  it('接受独立的 Plot token 转发入口并拒绝旧 palette namespace', () => {
    expect(
      ChartSharedSchema.safeParse({
        ...base,
        plotThemeTokens: { 'plot.palette.series': ['#2563eb'] },
      }).success,
    ).toBe(true);
    expect(
      ChartSharedSchema.safeParse({ ...base, plotThemeTokens: { 'data.palette.series': ['#2563eb'] } }).success,
    ).toBe(false);
    expect(
      ChartSharedSchema.safeParse({ ...base, plotStyleTokens: { 'plot.palette.series': ['#2563eb'] } }).success,
    ).toBe(false);
  });

  it('让每个 strict Chart variant 拒绝 spec-local style 与 themeMode', () => {
    const variants = [
      [
        ScatterChartSpecSchema,
        {
          namespace: 'chart',
          type: 'scatter',
          data: { reference: 'd' },
          encoding: { x: { field: 'x' }, y: { field: 'y' } },
        },
      ],
      [
        BubbleChartSpecSchema,
        {
          namespace: 'chart',
          type: 'bubble',
          data: { reference: 'd' },
          encoding: { x: { field: 'x' }, y: { field: 'y' }, size: { field: 'size' } },
        },
      ],
      [
        ConnectedScatterChartSpecSchema,
        {
          namespace: 'chart',
          type: 'connected-scatter',
          data: { reference: 'd' },
          encoding: { x: { field: 'x' }, y: { field: 'y' }, order: 'order' },
        },
      ],
    ] as const;

    for (const [schema, spec] of variants) {
      expect(schema.safeParse({ ...spec, style: 'clean' }).success).toBe(false);
      expect(schema.safeParse({ ...spec, themeMode: 'dark' }).success).toBe(false);
    }
  });

  it.each(['data.palette.series', 'axis.enabled', 'axis.grid.enabled', 'legend.enabled'])(
    '拒绝 Chart chartThemeTokens 中的非 canonical key：%s',
    token => {
      expect(ChartSharedSchema.safeParse({ ...base, chartThemeTokens: { [token]: true } }).success).toBe(false);
    },
  );
});
