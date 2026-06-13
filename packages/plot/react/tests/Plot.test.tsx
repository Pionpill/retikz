import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { ZodError } from 'zod';
import { Layout } from '@retikz/react';
import { type ExternalDatasets, type PlotSpec, lowerPlots } from '@retikz/plot';
import { Plot } from '../src';

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

/** 抽出 SVG 里所有点 glyph（circle 节点渲染为 ellipse）的 cx,cy 与 path 的 d（与资源 id 无关，作几何等价比较） */
const geometry = (svg: string) => {
  const glyphs = (svg.match(/<ellipse[^>]*>/g) ?? [])
    .map(c => {
      const m = /cx="([^"]+)"\s+cy="([^"]+)"/.exec(c);
      return m ? `${m[1]},${m[2]}` : c;
    })
    .sort();
  const paths = (svg.match(/\sd="[^"]+"/g) ?? []).sort();
  return { glyphs, paths };
};

describe('<Plot spec data> 薄包装', () => {
  it('渲染出含 path（折线）与 circle（散点）的 SVG', () => {
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} />);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<path');
    expect(svg).toContain('<ellipse');
  });

  it('省略 width/height 时仍渲染（Layout 自动布局）', () => {
    const svg = renderToStaticMarkup(<Plot spec={spec} data={data} />);
    expect(svg).toContain('<svg');
    expect(svg).toContain('<ellipse');
  });

  it('data 缺 spec 引用的数据集 → 渲染期抛错', () => {
    expect(() => renderToStaticMarkup(<Plot spec={spec} data={{}} width={480} height={300} />)).toThrow();
  });

  it('非法 spec（缺判别字段）→ 抛清晰 ZodError，不落到 core 内部崩', () => {
    // 模拟运行时拿到的残缺 spec（如 LLM 生成漏字段）
    const malformed = {} as unknown as PlotSpec;
    expect(() => renderToStaticMarkup(<Plot spec={malformed} data={{}} width={480} height={300} />)).toThrow(ZodError);
  });

  it('几何与手写 <Layout ir composites> 一致（证明薄包装不引入额外语义）', () => {
    const viaPlot = renderToStaticMarkup(<Plot spec={spec} data={data} width={480} height={300} />);
    const viaLayout = renderToStaticMarkup(
      <Layout
        ir={{ version: 1, type: 'scene', children: [spec] }}
        composites={lowerPlots(data, { width: 480, height: 300 })}
        width={480}
        height={300}
      />,
    );
    expect(geometry(viaPlot)).toEqual(geometry(viaLayout));
  });
});
