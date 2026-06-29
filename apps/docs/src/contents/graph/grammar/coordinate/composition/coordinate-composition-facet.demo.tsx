import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';

import { regionalSales } from './coordinate-composition.data';

const PANEL_WIDTH = 220;
const PANEL_HEIGHT = 180;

const Demo: FC = () => (
  <div style={{ width: 720, maxWidth: '100%', aspectRatio: '1.8 / 1' }}>
    <Plot data={regionalSales} width={PANEL_WIDTH} height={PANEL_HEIGHT} style={{ width: '100%', height: '100%' }}>
      <Scale dimension="x" type="linear" />
      <Scale dimension="y" type="linear" />
      <Facet
        id="sales"
        row={{ field: 'channel', order: ['online', 'store'] }}
        column={{ field: 'region', order: ['north', 'south', 'west'] }}
        scales={{ roles: { y: 'shared' } }}
        layout={{ panelGap: 24, axisGap: 8, labelGap: 6 }}
        guidePolicy={{ axes: 'outerShared', gridPlacement: 'self', facetLabels: 'rowColumn' }}
      />
      <Axis facetId="sales" dimension="x" title="month" />
      <Axis facetId="sales" dimension="y" grid title="revenue" />
      <PathMark facetId="sales" x="month" y="revenue" order="month" stroke="darkorange" strokeWidth={2} />
      <PointMark facetId="sales" x="month" y="revenue" fill="white" stroke="darkorange" strokeWidth={1.5} />
    </Plot>
  </div>
);

export default Demo;
