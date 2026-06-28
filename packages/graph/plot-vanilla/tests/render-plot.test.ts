import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { compileToScene } from '@retikz/core';
import { type ExternalDatasets, type PlotSpec, lowerPlots } from '@retikz/plot';
import { renderToSvgString } from '@retikz/vanilla';
import { renderPlot } from '../src';

const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { reference: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    { type: 'path', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
    { type: 'point', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
  ],
};

const data: ExternalDatasets = {
  sales: [
    { month: 0, revenue: 10 },
    { month: 1, revenue: 14 },
    { month: 2, revenue: 9 },
  ],
};

describe('renderPlot 薄包装（SSR SVG 串）', () => {
  it('返回含 <svg / <path / <ellipse（散点 glyph）的字符串', () => {
    const svg = renderPlot(spec, data, { width: 480, height: 300 });
    expect(typeof svg).toBe('string');
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });

  it('省略 options 时用默认尺寸仍渲染', () => {
    const svg = renderPlot(spec, data);
    expect(svg).toContain('<ellipse');
  });

  it('data 缺 spec 引用的数据集 → 调用期抛错', () => {
    expect(() => renderPlot(spec, {}, { width: 480, height: 300 })).toThrow();
  });

  it('非法 spec（缺判别字段）→ 抛清晰 ZodError，不落到 core 内部崩', () => {
    const malformed = {} as unknown as PlotSpec;
    expect(() => renderPlot(malformed, {}, { width: 480, height: 300 })).toThrow(ZodError);
  });

  it('与手写 compileToScene + renderToSvgString 等价（证明薄包装不引入额外语义）', () => {
    const viaRenderPlot = renderPlot(spec, data, { width: 480, height: 300 });
    const scene = compileToScene(
      { version: 1, type: 'scene', children: [spec] },
      { composites: lowerPlots(data, { width: 480, height: 300 }) },
    );
    expect(viaRenderPlot).toBe(renderToSvgString(scene, { width: 480, height: 300 }));
  });

  it('注入 width/height 到 <svg>（产物有显示尺寸，与 React <Plot> 对齐）', () => {
    const svg = renderPlot(spec, data, { width: 360, height: 200 });
    expect(svg).toMatch(/<svg[^>]*\swidth="360"/);
    expect(svg).toMatch(/<svg[^>]*\sheight="200"/);
  });

  // ADR-07：柱状 / 堆叠柱 SSR
  it('柱状 spec 渲出矩形（<rect>）', () => {
    const barSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } }],
    };
    expect(renderPlot(barSpec, data, { width: 480, height: 300 })).toMatch(/<rect/);
  });

  // ADR-05：polar PlotSpec → renderPlot 透传（多半零改，验证 SSR 落地）
  const share: ExternalDatasets = {
    share: [
      { label: 'A', value: 30 },
      { label: 'B', value: 50 },
      { label: 'C', value: 20 },
    ],
  };

  it('polar 饼图 spec → SVG 含扇形 path（arc 命令 A/a）', () => {
    const pieSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      transform: [{ kind: 'stack', y: 'value' }],
      scales: [
        { type: 'linear', name: 'angle' },
        { type: 'linear', name: 'radius' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label', scale: 'color' } } }],
    };
    const svg = renderPlot(pieSpec, share, { width: 360, height: 360 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    // 扇形外弧由 SVG arc 命令（A / a）描出，验证极坐标几何确已落地
    expect(svg).toMatch(/d="[^"]*[Aa][^"]*"/);
  });

  it('polar 环图 spec（innerRadius）→ SVG 含 path（透传不崩）', () => {
    const donutSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      transform: [{ kind: 'stack', y: 'value' }],
      scales: [
        { type: 'linear', name: 'angle' },
        { type: 'linear', name: 'radius' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', startAngle: 0, endAngle: 360, innerRadius: 0.5 },
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'y0', to: 'y1' }, y: { kind: 'full' } }, encoding: { color: { field: 'label', scale: 'color' } } }],
    };
    expect(renderPlot(donutSpec, share, { width: 360, height: 360 })).toContain('<path');
  });

  it('polar 径向柱 spec（interval + band 角向）→ SVG 含 path', () => {
    const radialBarSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'share' },
      scales: [
        { type: 'band', name: 'angle' },
        { type: 'linear', name: 'radius' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'polar2D', angle: 'angle', radius: 'radius', startAngle: 0, endAngle: 360, innerRadius: 0 },
      marks: [{ type: 'interval', encoding: { x: { field: 'label' }, y: { field: 'value' }, color: { field: 'label', scale: 'color' } } }],
    };
    expect(renderPlot(radialBarSpec, share, { width: 360, height: 360 })).toContain('<path');
  });

  // alpha.9 ADR-04：1D / ternary 坐标系 PlotSpec → renderPlot 透传（vanilla 直接消费 core IR，与 react 对等）
  const samples: ExternalDatasets = {
    samples: [{ v: 1 }, { v: 5 }, { v: 9 }],
  };

  it('cartesian1D rug spec → SVG 含散点 glyph（<ellipse）', () => {
    const rugSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      scales: [{ type: 'linear', name: 'x' }],
      coordinate: { type: 'cartesian1D', x: 'x' },
      marks: [{ type: 'point', encoding: { x: { field: 'v' } } }],
    };
    const svg = renderPlot(rugSpec, samples, { width: 480, height: 120 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<ellipse');
  });

  it('polar1D 环形点 spec → SVG 含散点 glyph', () => {
    const ringSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'hours' },
      scales: [{ type: 'linear', name: 'a' }],
      coordinate: { type: 'polar1D', angle: 'a', radius: 1, startAngle: 0, endAngle: 360 },
      marks: [{ type: 'point', encoding: { x: { field: 'h' } } }],
      guides: [{ type: 'axis', dimension: 'x' }],
    };
    const svg = renderPlot(ringSpec, { hours: [{ h: 0 }, { h: 90 }, { h: 180 }, { h: 270 }] }, { width: 320, height: 320 });
    expect(svg).toContain('<ellipse');
  });

  it('ternary2D 三元散点 spec → SVG 含散点 + 三角轴 path', () => {
    const ternarySpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'soils' },
      scales: [{ type: 'ordinal', name: 'col' }],
      coordinate: { type: 'ternary2D' },
      marks: [{ type: 'point', color: { kind: 'field', value: 'region', scale: 'col' }, encoding: { x: { field: 'sand' }, y: { field: 'silt' }, z: { field: 'clay' } } }],
      guides: [
        { type: 'axis', dimension: 'x' },
        { type: 'axis', dimension: 'y' },
        { type: 'axis', dimension: 'z' },
      ],
    };
    const soils: ExternalDatasets = {
      soils: [
        { sand: 60, silt: 30, clay: 10, region: 'north' },
        { sand: 20, silt: 50, clay: 30, region: 'south' },
      ],
    };
    const svg = renderPlot(ternarySpec, soils, { width: 360, height: 360 });
    expect(svg).toContain('<ellipse');
    expect(svg).toContain('<path');
  });

  // alpha.11 ADR-02：rect heatmap spec → renderPlot 透传（vanilla 不改 src，纯 spec 驱动出每格 <rect>）
  it('rect-vanilla-ssr-heatmap：双 band heatmap spec → SVG 含每格 <rect> + 填充色', () => {
    const heatmap: ExternalDatasets = {
      heat: [
        { rk: 'r0', ck: 'c0', v: 1 },
        { rk: 'r0', ck: 'c1', v: 5 },
        { rk: 'r1', ck: 'c0', v: 9 },
        { rk: 'r1', ck: 'c1', v: 3 },
      ],
    };
    const heatmapSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'heat', model: [{ name: 'rk', type: 'categorical' }, { name: 'ck', type: 'categorical' }, { name: 'v', type: 'continuous' }] },
      scales: [
        { type: 'band', name: 'rk' },
        { type: 'band', name: 'ck' },
        { type: 'sequential', name: 'heat', domain: [0, 9] },
      ],
      coordinate: { type: 'cartesian2D', x: 'rk', y: 'ck' },
      marks: [{ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'rk' }, y: { field: 'ck' }, color: { field: 'v', scale: 'heat' } } }],
    };
    const svg = renderPlot(heatmapSpec, heatmap, { width: 360, height: 360 });
    expect(svg).toContain('<svg');
    // 每格一个 <rect>（4 格）；填充色由 sequential 色阶 per-datum 取
    expect((svg.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(4);
    expect(svg).toMatch(/fill="[^"]+"/);
  });

  it('rect 缺 color heatmap spec → SVG 含 <rect>（纯网格透传不崩）', () => {
    const grid: ExternalDatasets = {
      grid: [
        { day: 'Mon', hour: 'AM' },
        { day: 'Mon', hour: 'PM' },
        { day: 'Tue', hour: 'AM' },
      ],
    };
    const gridSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'grid' },
      scales: [
        { type: 'band', name: 'day' },
        { type: 'band', name: 'hour' },
      ],
      coordinate: { type: 'cartesian2D', x: 'day', y: 'hour' },
      marks: [{ type: 'interval', bounds: { x: { kind: 'band' }, y: { kind: 'band' } }, encoding: { x: { field: 'day' }, y: { field: 'hour' } } }],
    };
    expect(renderPlot(gridSpec, grid, { width: 320, height: 320 })).toMatch(/<rect/);
  });

  // ADR-03：rule mark（参考线 + 参考带）SSR——vanilla 无代码改动，纯 spec 驱动端到端产出
  it('rule line + band spec → SVG 含参考线（<path>）与参考带（<rect> fill）', () => {
    const scores: ExternalDatasets = {
      scores: [
        { name: 'A', score: 60 },
        { name: 'B', score: 85 },
        { name: 'C', score: 92 },
      ],
    };
    const ruleSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'scores' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'interval', encoding: { x: { field: 'name' }, y: { field: 'score' } } },
        // 容差带 y∈[70,90]（band → projectCell rect，amber 填充）
        { type: 'reference', yTo: 90, encoding: { y: { value: 70 }, color: { value: 'amber' } } },
        // 及格线 y=60（line → core Path，crimson 描边）
        { type: 'reference', encoding: { y: { value: 60 }, color: { value: 'crimson' } } },
      ],
    };
    const svg = renderPlot(ruleSpec, scores, { width: 480, height: 300 });
    expect(svg).toContain('<svg');
    // band → <rect> 含 amber 填充；line → <path> 含 crimson 描边
    expect(svg).toMatch(/<rect[^>]*fill="amber"/);
    expect(svg).toMatch(/<path[^>]*stroke="crimson"/);
  });

  it('per-datum rule（field 多线 + color field）SSR → 多条参考线', () => {
    const limits: ExternalDatasets = {
      limits: [
        { threshold: 30, category: 'low' },
        { threshold: 60, category: 'mid' },
        { threshold: 90, category: 'high' },
      ],
    };
    const perDatumSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'limits', model: [{ name: 'threshold', type: 'continuous' }, { name: 'category', type: 'categorical' }] },
      scales: [
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'c' },
      ],
      coordinate: { type: 'cartesian2D', y: 'y' },
      marks: [{ type: 'reference', encoding: { y: { field: 'threshold' }, color: { field: 'category', scale: 'c' } } }],
    };
    const svg = renderPlot(perDatumSpec, limits, { width: 480, height: 300 });
    // 3 行 → 3 条参考线（per-datum field）
    expect((svg.match(/<path/g) ?? []).length).toBeGreaterThanOrEqual(3);
  });

  // ADR-04：text mark / datum label SSR（vanilla 源码无改动，纯 spec 驱动贯通三包）
  it('vanilla-label-ssr 宿主 label：interval label → <text> 元素 + 标签内容串', () => {
    const labelSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'sales' },
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'interval',
          label: { content: { field: 'revenue', displayFormat: ',.0f' }, position: 'above', distance: 6 },
          encoding: { x: { field: 'month' }, y: { field: 'revenue' } },
        },
      ],
    };
    const svg = renderPlot(labelSpec, data, { width: 480, height: 300 });
    expect(svg).toMatch(/<rect/);
    expect(svg).toContain('<text');
    // 标签内容（千分位格式后整数）出现在 SVG 文本里
    expect(svg).toContain('>10<');
    expect(svg).toContain('>14<');
  });

  it('vanilla-label-ssr 自由 TextMark：text mark → <text> 元素 + 字段值串', () => {
    const textSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'labels' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'px' }, y: { field: 'py' }, text: { field: 'label' } } }],
    };
    const labels: ExternalDatasets = {
      labels: [
        { px: 1, py: 2, label: 'alpha' },
        { px: 3, py: 4, label: 'beta' },
      ],
    };
    const svg = renderPlot(textSpec, labels, { width: 480, height: 300 });
    expect(svg).toContain('<text');
    expect(svg).toContain('alpha');
    expect(svg).toContain('beta');
  });

  // alpha.12 ADR-01：histogram（bin transform + interval x0/x1 连续 x 区间柱）SSR
  it('histogram bin + interval x0/x1 → SSR 出连续 x 直方柱（<path）', () => {
    const histData: ExternalDatasets = { s: [{ m: 0 }, { m: 1 }, { m: 3 }, { m: 5 }, { m: 8 }, { m: 9 }] };
    const histogramSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 's' },
      transform: [{ kind: 'bin', field: 'm', step: 2 }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', bounds: { x: { kind: 'extent', from: 'binStart', to: 'binEnd' } }, encoding: { y: { field: 'binCount' } } }],
    };
    const svg = renderPlot(histogramSpec, histData, { width: 480, height: 300 });
    expect(svg).toContain('<svg');
    // 连续 x 区间柱为矩形 Node → <rect>；紧贴排列（相邻柱 x 接续）
    expect(svg).toContain('<rect');
    expect((svg.match(/<rect/g) ?? []).length).toBeGreaterThanOrEqual(2);
  });

  // alpha.12 ADR-01：分组聚合柱（summarize transform → band 柱）SSR
  it('summarize groupBy sum → SSR 出聚合柱（<path）', () => {
    const orders: ExternalDatasets = {
      o: [
        { region: 'N', revenue: 3 },
        { region: 'N', revenue: 5 },
        { region: 'S', revenue: 2 },
      ],
    };
    const aggSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'o' },
      transform: [{ kind: 'summarize', groupBy: ['region'], metrics: [{ op: 'sum', field: 'revenue', as: 'total' }] }],
      scales: [
        { type: 'band', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'interval', encoding: { x: { field: 'region' }, y: { field: 'total' } } }],
    };
    // 聚合柱（band 矩形 Node）→ <rect>；两组（N/S）两根柱
    const svg = renderPlot(aggSpec, orders, { width: 480, height: 300 });
    expect(svg).toContain('<rect');
    expect((svg.match(/<rect/g) ?? []).length).toBe(2);
  });

  // alpha.12 ADR-02：jitter 确定性——同 seed 两次 SSR 渲染逐字节相同（locator parity / 确定性快照）
  it('jitter 同 seed 两次 SSR 渲染逐字节相同（确定性 PRNG）', () => {
    const scatterPts: ExternalDatasets = {
      pts: [
        { dose: 1, response: 10 },
        { dose: 1, response: 12 },
        { dose: 2, response: 8 },
        { dose: 2, response: 9 },
      ],
    };
    const jitterSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'pts' },
      transform: [{ kind: 'jitter', axis: 'x', xField: 'dose', amount: 0.3, seed: 42 }],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [{ type: 'point', encoding: { x: { field: 'dose' }, y: { field: 'response' } } }],
    };
    const a = renderPlot(jitterSpec, scatterPts, { width: 480, height: 300 });
    const b = renderPlot(jitterSpec, scatterPts, { width: 480, height: 300 });
    expect(a).toBe(b);
    expect(a).toContain('<ellipse');
  });

  it('density transform + PathMark area spec → SSR 出闭合密度面积 path', () => {
    const densityData: ExternalDatasets = {
      samples: [
        { species: 'A', value: 0 },
        { species: 'A', value: 4 },
        { species: 'B', value: 10 },
        { species: 'B', value: 14 },
      ],
    };
    const densitySpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      transform: [
        {
          kind: 'density',
          field: 'value',
          groupBy: ['species'],
          bandwidth: { kind: 'value', value: 2 },
          sampleCount: 8,
          xAs: 'densityX',
          densityAs: 'density',
        },
      ],
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        {
          type: 'path',
          series: 'species',
          order: 'densityX',
          closure: { kind: 'baseline', baseline: 0 },
          fill: { kind: 'constant', value: '#60a5fa' },
          fillOpacity: { kind: 'constant', value: 0.28 },
          encoding: { x: { field: 'densityX' }, y: { field: 'density' }, color: { field: 'species', scale: 'color' } },
        },
      ],
    };
    const svg = renderPlot(densitySpec, densityData, { width: 480, height: 300 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toMatch(/fill="#60a5fa"/);
  });

  it('smooth transform + PathMark spec → SSR 出趋势线 path', () => {
    const smoothData: ExternalDatasets = {
      samples: [
        { series: 'A', time: 0, value: 1 },
        { series: 'A', time: 1, value: 3 },
        { series: 'A', time: 2, value: 5 },
        { series: 'B', time: 0, value: 10 },
        { series: 'B', time: 1, value: 8 },
        { series: 'B', time: 2, value: 6 },
      ],
    };
    const smoothSpec: PlotSpec = {
      namespace: 'plot',
      type: 'plot',
      data: { reference: 'samples' },
      scales: [
        { type: 'linear', name: 'x' },
        { type: 'linear', name: 'y' },
        { type: 'ordinal', name: 'color' },
      ],
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      marks: [
        { type: 'point', encoding: { x: { field: 'time' }, y: { field: 'value' }, color: { field: 'series', scale: 'color' } } },
        {
          type: 'path',
          transform: [{ kind: 'smooth', x: 'time', y: 'value', groupBy: ['series'], sampleCount: 8, xAs: 'trendX', yAs: 'trendY' }],
          series: 'series',
          order: 'trendX',
          encoding: { x: { field: 'trendX' }, y: { field: 'trendY' }, color: { field: 'series', scale: 'color' } },
        },
      ],
    };
    const svg = renderPlot(smoothSpec, smoothData, { width: 480, height: 300 });
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });
});
