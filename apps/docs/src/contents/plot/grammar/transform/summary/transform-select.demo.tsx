import { Axis, Plot, PointMark, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { cityRevenue } from './transform-select.data';

const Demo: FC = () => (
  <Plot data={cityRevenue} width={460} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="select" groupBy={['region']} selector={{ op: 'max', by: 'revenue' }} />
    <PointMark x="region" y="revenue" color="region" text="city" size={7} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
