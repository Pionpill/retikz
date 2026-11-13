import { SlopeChartSchema } from '@retikz/chart/line';
import { normalizeScene, renderToSvgString, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { slopeChart, slopeChartInputEmbedAdapter, slopeMark, normalizeSlopeChart } from '../../src/line';
import { scatterChart, scatterChartInputEmbedAdapter } from '../../src/point';

const rows = [
  { x: 0, y: 1, s: 'A' },
  { x: 1, y: 2, s: 'A' },
  { x: 0, y: 2, s: 'B' },
  { x: 1, y: 1, s: 'B' },
];

describe('Slope Vanilla 输入闭环', () => {
  it.each([false, true, {}, { size: 4, fill: '#123456' }])('InputEmbed 与直接 Source 保留 point %j', point => {
    const recipe = {
      encodings: { entity: 's', start: 'x', end: 'y' },
      properties: { point },
      marks: [slopeMark({ override: true, properties: { path: { strokeWidth: 3 } } })],
    };
    const input = slopeChart({ data: rows, ...recipe });
    const actual = normalizeScene(scene({ children: [input] }), { adapters: [slopeChartInputEmbedAdapter] }).ir
      .children[0];
    const expected = normalizeSlopeChart({ data: { reference: 'chart.data' }, ...recipe });
    expect(actual).toEqual(expected);
    expect(SlopeChartSchema.parse(actual)).toEqual(SlopeChartSchema.parse(expected));
  });

  it('Slope 和 Point provider 在同一场景独立编译并生成 SVG', () => {
    const svg = renderToSvgString(
      scene({
        children: [
          slopeChart({
            id: 'trend',
            dataRef: 'trend.rows',
            data: rows,
            encodings: { entity: 's', start: 'x', end: 'y' },
            properties: { point: true },
          }),
          scatterChart({
            id: 'observations',
            dataRef: 'points.rows',
            data: rows,
            encodings: { x: 'x', y: 'y' },
            panel: { position: [700, 0] },
          }),
        ],
      }),
      { adapters: [slopeChartInputEmbedAdapter, scatterChartInputEmbedAdapter] },
    );
    expect(svg).toContain('<svg');
    expect(svg).toContain('trend');
    expect(svg).toContain('observations');
    expect(svg).toContain('<path');
  });
});
