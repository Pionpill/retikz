import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { regionalSales } from './coordinate-composition-facet.data';

const Demo: FC = () => (
  <Plot data={regionalSales} width={660} height={330}>
    <Facet
      id="sales"
      row={{ field: 'channel', order: ['online', 'store'] }}
      column={{ field: 'region', order: ['north', 'south', 'west'] }}
      layout={{ panelGap: 24 }}
    >
      <Axis dimension="x" title="month" />
      <Axis dimension="y" grid title="revenue" />
      <PathMark x="month" y="revenue" order="month" stroke="darkorange" strokeWidth={2} />
      <PointMark x="month" y="revenue" fill="white" stroke="darkorange" strokeWidth={1.5} />
    </Facet>
  </Plot>
);

export default Demo;
