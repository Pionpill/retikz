import type { PlotSpec } from '@retikz/plot';
import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { regionalSales } from './coordinate-composition.data';

const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 180;

const composition = {
  defaultScope: 'panel',
  scopes: [{ id: 'panel', coordinate: { type: 'cartesian2D' } }],
  facets: [
    {
      id: 'sales',
      row: { field: 'channel', order: ['online', 'store'] },
      column: { field: 'region', order: ['north', 'south', 'west'] },
      scales: { roles: { y: 'shared' } },
    },
  ],
  layout: { panelGap: 24, axisGap: 8, labelGap: 6 },
  guidePolicy: { axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' },
} satisfies NonNullable<PlotSpec['composition']>;

const Demo: FC = () => (
  <div style={{ width: 720, maxWidth: '100%', aspectRatio: '1.8 / 1' }}>
    <Plot
      data={regionalSales}
      width={PANEL_WIDTH}
      height={PANEL_HEIGHT}
      composition={composition}
      style={{ width: '100%', height: '100%' }}
    >
      <Scale dimension="x" type="linear" />
      <Scale dimension="y" type="linear" />
      <PathMark x="month" y="revenue" order="month" stroke="darkorange" strokeWidth={2} />
      <PointMark x="month" y="revenue" fill="white" stroke="darkorange" strokeWidth={1.5} />
      <Axis dimension="x" placement={{ kind: 'side', side: 'bottom' }} title="month" />
      <Axis dimension="y" placement={{ kind: 'side', side: 'left' }} grid title="revenue" />
    </Plot>
  </div>
);

export default Demo;
