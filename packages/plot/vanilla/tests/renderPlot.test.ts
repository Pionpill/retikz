import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { compileToScene } from '@retikz/core';
import { type ExternalDatasets, type PlotSpec, lowerPlots } from '@retikz/plot';
import { renderToSvgString } from '@retikz/vanilla';
import { renderPlot } from '../src';

const spec: PlotSpec = {
  namespace: 'plot',
  type: 'plot',
  data: { ref: 'sales' },
  scales: [
    { type: 'linear', name: 'x' },
    { type: 'linear', name: 'y' },
  ],
  coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
  marks: [
    { type: 'line', order: 'month', encoding: { x: { field: 'month' }, y: { field: 'revenue' } } },
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
});
