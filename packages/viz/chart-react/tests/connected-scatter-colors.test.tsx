import { connectedScatterChartInputEmbedAdapter, connectedScatterChart } from '@retikz/chart-vanilla/point';
import { normalizeScene, scene } from '@retikz/vanilla';
import { expect, it } from 'vitest';

import { ChartData } from '../src';
import {
  ConnectedScatterChart,
  ConnectedScatterEncodings,
  ConnectedScatterProperties,
} from '../src/point/connected-scatter';

it('通过 React 和 Vanilla 保留连通散点图 colorMode', () => {
  const rows = [
    { x: 0, y: 0, order: 1 },
    { x: 1, y: 2, order: 2 },
  ];
  const react = ConnectedScatterChart.createInputEmbedProps({
    children: (
      <>
        <ChartData data={rows} />
        <ConnectedScatterEncodings x="x" y="y" order="order" />
        <ConnectedScatterProperties colorMode="mark" />
      </>
    ),
  });
  const vanilla = {
    data: rows,
    encodings: { x: 'x', y: 'y', order: 'order' },
    properties: { colorMode: 'mark' as const },
  };
  const normalize = (input: typeof vanilla | typeof react) =>
    normalizeScene(scene({ children: [connectedScatterChart(input)] }), {
      adapters: [connectedScatterChartInputEmbedAdapter],
    }).ir;

  expect(normalize(react)).toEqual(normalize(vanilla));
});
