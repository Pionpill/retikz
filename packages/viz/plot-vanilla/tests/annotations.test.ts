import { describe, expect, it } from 'vitest';

import { plot, renderPlot } from '../src';

describe('常量标记渲染', () => {
  it('通过 SVG 使用显式空绑定渲染三个标记几何形状', () => {
    const source = plot({
      data: { reference: 'rows' },
      coordinate: { type: 'cartesian2D', x: 'x', y: 'y' },
      scales: [
        { type: 'linear', name: 'x', domain: [0, 10], domainPadding: 0 },
        { type: 'linear', name: 'y', domain: [0, 10], domainPadding: 0 },
      ],
      marks: [
        {
          type: 'interval',
          contributeToDomain: false,
          encodings: {
            bounds: { x: { from: { value: 2 }, to: { value: 4 } }, y: { from: { value: 2 }, to: { value: 8 } } },
          },
          properties: { bounds: { x: { kind: 'extent' }, y: { kind: 'extent' } }, fill: 'blue' },
        },
        {
          type: 'path',
          contributeToDomain: false,
          encodings: { from: { x: { edge: 'start' }, y: { value: 5 } }, to: { x: { edge: 'end' }, y: { value: 5 } } },
          properties: { stroke: 'red' },
        },
        {
          type: 'point',
          contributeToDomain: false,
          encodings: { position: { x: { value: 6 }, y: { value: 6 } } },
          properties: { text: 'target' },
        },
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
