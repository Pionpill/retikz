import type { FC } from 'react';

import { Axis, Facet, PathMark, Plot, PointMark } from '@retikz/plot-react';

import { segmentRows } from './coordinate-composition-facet-basic.data';

const Demo: FC = () => (
  <Plot data={segmentRows} width={560} height={250}>
    <Facet id="segments" column={{ field: 'segment', order: ['consumer', 'team', 'enterprise'] }} layout={{ panelGap: 20 }} />
    <Axis facetId="segments" dimension="x" title="week" />
    <Axis facetId="segments" dimension="y" grid title="active users" />
    <PathMark facetId="segments" x="week" y="users" order="week" stroke="darkorange" strokeWidth={2.5} />
    <PointMark facetId="segments" x="week" y="users" fill="white" stroke="darkorange" strokeWidth={1.5} />
  </Plot>
);

export default Demo;
