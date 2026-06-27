import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

const rows = [
  { month: 'Jan', sales: 12 },
  { month: 'Feb', sales: 18 },
  { month: 'Mar', sales: 15 },
  { month: 'Apr', sales: 24 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'month', type: 'categorical' },
      { name: 'sales', type: 'continuous' },
    ]}
    width={360}
    height={220}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="month" y="sales" size={7} fill="#2563eb" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
