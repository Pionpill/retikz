import { describe, expect, it } from 'vitest';

import { intervalAnnotation, pathAnnotation, plot, pointAnnotation, renderPlot } from '../src';

describe('annotation rendering', () => {
  it('renders all three factories through the existing SVG entry with an explicit empty binding', () => {
    const source = plot({
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
      ],
      marks: [
        intervalAnnotation({ x: { from: 2, to: 4 }, y: { from: 2, to: 8 }, fill: 'blue' }),
        pathAnnotation({ from: { x: { edge: 'start' }, y: 5 }, to: { x: { edge: 'end' }, y: 5 }, stroke: 'red' }),
        pointAnnotation({ x: 6, y: 6, text: 'target' }),
      ],
    });
    const svg = renderPlot(source, { rows: [] });
    expect(svg).toContain('<svg');
    expect(svg).toContain('target');
    expect(svg).toContain('blue');
    expect(svg).toContain('red');
    expect(() => renderPlot(source, {})).toThrow(/binding|data/i);
  });
});
