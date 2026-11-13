import { slopeChart, slopeChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { ChartData } from '../../src';
import { SlopeChart, SlopeEncodings, SlopeProperties, SlopeMark } from '../../src/line';

const rows = [
  { s: 'A', x: 0, y: 1 },
  { s: 'B', x: 1, y: 2 },
];

describe('Slope React 声明', () => {
  it.each([false, true, {}, { size: 4, fill: '#123456' }])('root 与 JSX 声明保留 point %j 并产生相同 Source', point => {
    const root = SlopeChart.createInputEmbedProps({
      rows,
      recipe: {
        encodings: { entity: 's', start: 'x', end: 'y' },
        properties: { point },
        marks: [{ kind: 'slope', override: true, properties: { path: { strokeWidth: 4 } } }],
      },
    });
    const declarations = SlopeChart.createInputEmbedProps({
      children: (
        <>
          <ChartData data={rows} />
          <SlopeEncodings entity="s" start="x" end="y" />
          <SlopeProperties point={point} />
          <SlopeMark override properties={{ path: { strokeWidth: 4 } }} />
        </>
      ),
    });
    expect(declarations).toEqual(root);
    const normalize = (input: typeof root) =>
      normalizeScene(scene({ children: [slopeChart(input)] }), { adapters: [slopeChartInputEmbedAdapter] }).ir;
    expect(normalize(declarations)).toEqual(normalize(root));
  });

  it('同一个 slot 不接受 root 与 declaration 两个来源', () => {
    expect(() =>
      SlopeChart.createInputEmbedProps({
        rows,
        recipe: { encodings: { entity: 's', start: 'x', end: 'y' } },
        children: <SlopeEncodings entity="s" start="x" end="y" />,
      }),
    ).toThrow();
  });
});
