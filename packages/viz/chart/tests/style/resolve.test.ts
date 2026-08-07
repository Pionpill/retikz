import { ThemeMode, ThemeStyle } from '@retikz/core';
import { describe, expect, it } from 'vitest';

import { resolveChartSpec } from '../../src/resolution';
import { ChartStyleToken } from '../../src/style';

const base = {
  namespace: 'chart',
  type: 'scatter',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: { field: 'amount' }, y: { field: 'margin' } },
} as const;

describe('Chart style resolution', () => {
  it('默认解析 neutral/light，并保持 Plot authoring 输入未物化', () => {
    const result = resolveChartSpec(base);
    expect(result.plotSpec.theme).toBeUndefined();
    expect(result.plotSpec.styleTokens).toBeUndefined();
    expect(result.inspection.style.chart).toMatchObject({
      style: 'neutral',
      mode: 'light',
      tokens: { [ChartStyleToken.ChartCanvasFill]: '#FFFFFF' },
    });
    expect(result.inspection.style.chart.tokenSources).toHaveLength(37);
    expect(result.inspection.style.plot).toMatchObject({ style: 'neutral', mode: 'light' });
    expect(result.inspection.style.plot.tokenSources).toHaveLength(40);
  });

  it('分别解析 Chart token 与 Plot cascade，并原样转发 Plot 输入', () => {
    const input = {
      ...base,
      styleTokens: { 'chart.padding': 20 },
      plotStyleTokens: {
        'plot.label.font.size': 14,
        'plot.palette.categorical': ['#token'],
      },
      colors: ['#colors-a', '#colors-b'],
      theme: {
        labelText: { font: { weight: 700 } },
        palette: { series: ['#raw-series'] },
      },
    } as const;
    const result = resolveChartSpec(input, { style: ThemeStyle.Academic, mode: ThemeMode.Dark });

    expect(result.plotSpec.styleTokens).toEqual(input.plotStyleTokens);
    expect(result.plotSpec.colors).toEqual(input.colors);
    expect(result.plotSpec.theme).toEqual(input.theme);
    expect(result.inspection.style.chart.tokens['chart.padding']).toBe(20);
    expect(result.inspection.style.plot.theme.labelText).toMatchObject({ font: { size: 14, weight: 700 } });
    expect(result.inspection.style.plot.palette).toMatchObject({
      categorical: ['#colors-a', '#colors-b'],
      series: ['#raw-series'],
      sector: ['#colors-a', '#colors-b'],
    });
    expect(result.inspection.style.plot.authoredOverrides).toEqual([
      { kind: 'colors', path: '$spec/colors' },
      { kind: 'theme', path: '$spec/theme' },
    ]);
  });

  it('topology token 只控制 recipe defaults，显式 guide 保持最高优先级', () => {
    expect(resolveChartSpec({ ...base, styleTokens: { 'chart.axis.enabled': false } }).plotSpec.guides).toEqual([]);
    expect(
      resolveChartSpec({
        ...base,
        styleTokens: { 'chart.axis.enabled': false, 'chart.axis.grid.enabled': false },
        guides: [{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }]);
  });

  it('effective Theme 切换不改变 data、核心 recipe、空间根与 identity', () => {
    const neutral = resolveChartSpec(base);
    const clean = resolveChartSpec(base, { style: ThemeStyle.Clean, mode: ThemeMode.Dark });
    const stableProjection = (result: typeof neutral) => ({
      data: result.plotSpec.data,
      transform: result.plotSpec.transform,
      scales: result.plotSpec.scales,
      coordinate: result.plotSpec.coordinate,
      composition: result.plotSpec.composition,
      marks: result.plotSpec.marks,
      chart: result.inspection.chart,
      plot: result.inspection.plot,
      memberTargets: result.inspection.members
        .filter(member => member.kind !== 'guide')
        .map(member => [member.kind, member.target]),
    });
    expect(stableProjection(clean)).toEqual(stableProjection(neutral));
  });
});
