import { renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { scatterChart, scatterChartInputEmbedAdapter, bubbleChart, bubbleChartInputEmbedAdapter } from '../src/point';

const input = {
  id: 'scatter',
  data: [
    { x: 1, y: 2 },
    { x: 2, y: 3 },
  ],
  encodings: { x: 'x', y: 'y' },
};

describe('Chart Vanilla 标准组成', () => {
  it('在标准嵌入中保留原始编写输入', () => {
    const chart = scatterChart(input);

    expect(chart).toEqual({ type: 'embed', kind: scatterChartInputEmbedAdapter.kind, id: 'scatter', props: input });
    expect(chart.props).toBe(input);
  });

  it('渲染为共享 Vanilla 场景的子级', () => {
    const svg = renderToSvgString(scene({ children: [scatterChart(input)] }), {
      adapters: [scatterChartInputEmbedAdapter],
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('scatter');
  });

  it('通过共享提供者聚合组成不同的图表类型', () => {
    const bubble = bubbleChart({
      id: 'bubble',
      dataRef: 'bubble.rows',
      data: [{ x: 1, y: 3, size: 5 }],
      encodings: { x: 'x', y: 'y', size: 'size' },
      panel: { position: [700, 0] },
    });
    const svg = renderToSvgString(scene({ children: [scatterChart(input), bubble] }), {
      adapters: [scatterChartInputEmbedAdapter, bubbleChartInputEmbedAdapter],
    });

    expect(svg).toContain('scatter');
    expect(svg).toContain('bubble');
  });

  it('通过 Vanilla 处理边界报告缺失的适配器', () => {
    expect(() => renderToSvgString(scene({ children: [scatterChart(input)] }))).toThrow(/adapter/i);
  });
});
