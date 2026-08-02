import { describe, expect, it } from 'vitest';

import { materializeChartPlotTheme, mergeChartPlotTheme, resolveChartSpec } from '../../src/pipeline';
import { getChartStylePreset } from '../../src/providers';
import { ChartStyleToken } from '../../src/schemas';

const base = {
  namespace: 'chart',
  type: '__infrastructure-fixture',
  id: 'sales',
  data: { reference: 'rows' },
  encoding: { x: 'amount', y: 'margin' },
} as const;

describe('Chart style pipeline', () => {
  it('默认解析 neutral/light，并把完整 token 投影到 Plot theme 与 inspection', () => {
    const result = resolveChartSpec(base);

    expect(result.plotSpec.theme).toMatchObject({
      background: '#FAFAFA',
      typography: { font: { family: 'system-ui, Segoe UI, sans-serif' }, textColor: '#18181B' },
      axis: { line: false, tickLabels: { textColor: '#52525B' }, grid: { stroke: '#E4E4E7' } },
      palette: { categorical: ['#E76E50', '#2A9D90', '#274754', '#E8C468', '#F4A462'] },
    });
    expect(result.inspection.style).toMatchObject({
      preset: 'neutral',
      mode: 'light',
      tokens: { [ChartStyleToken.ChartCanvasFill]: '#FFFFFF' },
    });
    expect(result.inspection.style.tokenSources).toHaveLength(75);
  });

  it('按 preset < styleTokens < colors < raw theme 合并且保留 object sibling', () => {
    const result = resolveChartSpec({
      ...base,
      style: 'academic',
      themeMode: 'dark',
      styleTokens: {
        'plot.label.font.size': 14,
        'data.palette.categorical': ['#token'],
      },
      colors: ['#colors-a', '#colors-b'],
      theme: {
        labelText: { font: { weight: 700 } },
        palette: { series: ['#raw-series'] },
      },
    });

    expect(result.plotSpec.theme?.labelText).toEqual({
      font: { family: 'Inter, Helvetica Neue, Arial, sans-serif', size: 14, weight: 700 },
      textColor: '#D1D5DB',
    });
    expect(result.plotSpec.theme?.palette).toMatchObject({
      categorical: ['#colors-a', '#colors-b'],
      series: ['#raw-series'],
      sector: ['#colors-a', '#colors-b'],
      sequential: 'cividis',
      diverging: 'rdbu',
    });
    expect(result.inspection.style.authoredOverrides).toEqual([
      { kind: 'colors', path: '$spec/colors' },
      { kind: 'theme', path: '$spec/theme' },
    ]);
  });

  it('discriminator 改变时整体替换 tick mark，不继承旧 kind 字段', () => {
    expect(
      mergeChartPlotTheme(
        { axis: { ticks: { mark: { kind: 'line', length: 4, line: { stroke: '#111', strokeWidth: 1 } } } } },
        { axis: { ticks: { mark: { kind: 'circle', size: 6, fill: '#fff' } } } },
      ),
    ).toEqual({ axis: { ticks: { mark: { kind: 'circle', size: 6, fill: '#fff' } } } });
  });

  it('preset 覆盖 recipe theme default，raw theme 再覆盖 preset', () => {
    const tokens = getChartStylePreset('neutral', 'light');
    expect(
      materializeChartPlotTheme(
        tokens,
        undefined,
        { background: '#raw' },
        { background: '#recipe', palette: { sequential: 'recipe-scheme' } },
      ),
    ).toMatchObject({
      background: '#raw',
      palette: { sequential: 'cividis' },
    });
  });

  it('topology token 只控制 recipe defaults，显式 guide 保持最高优先级', () => {
    expect(resolveChartSpec({ ...base, styleTokens: { 'axis.enabled': false } }).plotSpec.guides).toEqual([]);
    expect(
      resolveChartSpec({
        ...base,
        styleTokens: { 'axis.enabled': false, 'axis.grid.enabled': false },
        guides: [{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([{ type: 'axis', id: 'explicit', dimension: 'x', grid: true }]);
  });

  it('axis 默认关闭时 type-specific patch 只恢复自身 target', () => {
    expect(
      resolveChartSpec({
        ...base,
        styleTokens: { 'axis.enabled': false },
        components: [{ target: 'guide.x', grid: true }],
      }).plotSpec.guides,
    ).toEqual([
      {
        type: 'axis',
        id: '__chart.__infrastructure-fixture.guide.x',
        dimension: 'x',
        grid: true,
      },
    ]);
  });

  it('style 切换不改变 data、transform、核心 mark/encoding、scale、空间根与 identity', () => {
    const neutral = resolveChartSpec(base);
    const clean = resolveChartSpec({ ...base, style: 'clean', themeMode: 'dark' });
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
