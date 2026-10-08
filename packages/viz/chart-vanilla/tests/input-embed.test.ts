import { renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { scatterChart, ScatterChartInputEmbedAdapter, bubbleChart, BubbleChartInputEmbedAdapter } from '../src/point';

const input = {
  id: 'scatter',
  data: [
    { x: 1, y: 2 },
    { x: 2, y: 3 },
  ],
  encodings: { x: 'x', y: 'y' },
};

describe('Chart Vanilla standard composition', () => {
  it('preserves raw authoring input in a standard embed', () => {
    const chart = scatterChart(input);

    expect(chart).toEqual({ type: 'embed', kind: ScatterChartInputEmbedAdapter.kind, id: 'scatter', props: input });
    expect(chart.props).toBe(input);
  });

  it('renders as a child of the shared Vanilla scene', () => {
    const svg = renderToSvgString(scene({ children: [scatterChart(input)] }), {
      adapters: [ScatterChartInputEmbedAdapter],
    });

    expect(svg).toContain('<svg');
    expect(svg).toContain('scatter');
  });

  it('composes different chart types through the shared provider aggregation', () => {
    const bubble = bubbleChart({
      id: 'bubble',
      dataRef: 'bubble.rows',
      data: [{ x: 1, y: 3, size: 5 }],
      encodings: { x: 'x', y: 'y', size: 'size' },
      panel: { position: [700, 0] },
    });
    const svg = renderToSvgString(scene({ children: [scatterChart(input), bubble] }), {
      adapters: [ScatterChartInputEmbedAdapter, BubbleChartInputEmbedAdapter],
    });

    expect(svg).toContain('scatter');
    expect(svg).toContain('bubble');
  });

  it('reports a missing adapter through the Vanilla processing boundary', () => {
    expect(() => renderToSvgString(scene({ children: [scatterChart(input)] }))).toThrow(/adapter/i);
  });
});
