import { lineChart, lineChartInputEmbedAdapter } from '@retikz/chart-vanilla/line';
import { normalizeScene, scene } from '@retikz/vanilla';
import { describe, expect, it } from 'vitest';

import { ChartData } from '../../src';
import { LineChart, LineEncodings, LineProperties, LineMark } from '../../src/line';

const rows = [
  { x: 0, y: 1 },
  { x: 1, y: 2 },
];

describe('Line React 声明', () => {
  it.each([false, true, {}, { size: 4, fill: '#123456' }])('root 与 JSX 声明保留 point %j 并产生相同 Source', point => {
    const root = LineChart.createInputEmbedProps({
      rows,
      recipe: {
        encodings: { x: 'x', y: 'y' },
        properties: { point },
        marks: [{ kind: 'line', override: true, properties: { path: { curve: 'step' } } }],
      },
    });
    const declarations = LineChart.createInputEmbedProps({
      children: (
        <>
          <ChartData data={rows} />
          <LineEncodings x="x" y="y" />
          <LineProperties point={point} />
          <LineMark override properties={{ path: { curve: 'step' } }} />
        </>
      ),
    });
    expect(declarations).toEqual(root);
    const normalize = (input: typeof root) =>
      normalizeScene(scene({ children: [lineChart(input)] }), { adapters: [lineChartInputEmbedAdapter] }).ir;
    expect(normalize(declarations)).toEqual(normalize(root));
  });

  it('同一个 slot 不接受 root 与 declaration 两个来源', () => {
    expect(() =>
      LineChart.createInputEmbedProps({
        rows,
        recipe: { encodings: { x: 'x', y: 'y' } },
        children: <LineEncodings x="x" y="y" />,
      }),
    ).toThrow();
  });
});
