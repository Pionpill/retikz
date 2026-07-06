import type { FC } from 'react';

import { Axis, IntervalMark, Plot, PointMark } from '@retikz/plot-react';

import { storeRevenue } from './bar-transform.data';

const Demo: FC = () => (
  <Plot data={storeRevenue} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="segment" y="revenue" fill="#94a3b8" opacity={0.45} minimumSize={6} />
    <IntervalMark
      x="segment"
      bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }}
      color="segment"
      label="store"
      transform={[{ kind: 'derive-interval', from: 'revenue', baseline: 0 }]}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
