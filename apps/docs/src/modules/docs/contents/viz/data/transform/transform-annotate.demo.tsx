import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Transform } from '@retikz/plot-react';

import { storeRevenue } from './transform-annotate.data';

const Demo: FC = () => (
  <Plot data={storeRevenue} width={460} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="annotate" groupBy={['store']} metrics={[{ kind: 'mean', field: 'revenue', as: 'storeMean' }]} />
    <PointMark x="quarter" y="revenue" color="store" size={5} />
    <PathMark x="quarter" y="storeMean" series="store" strokeWidth={2.2} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
