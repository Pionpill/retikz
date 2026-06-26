import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { regionOrders } from './point-transform.data';

const Demo: FC = () => (
  <Plot data={regionOrders} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="region" y="orders" fill="#94a3b8" opacity={0.35} minimumSize={6} />
    <PointMark
      x="region"
      y="totalOrders"
      size="totalOrders"
      color="region"
      label="region"
      transform={[{ kind: 'aggregate', groupBy: ['region'], reduce: 'sum', field: 'orders', as: 'totalOrders' }]}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
