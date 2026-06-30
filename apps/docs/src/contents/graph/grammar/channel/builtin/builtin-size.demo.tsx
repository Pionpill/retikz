import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 10, amount: 8 },
  { x: 2, y: 13, amount: 28 },
  { x: 3, y: 16, amount: 64 },
  { x: 4, y: 19, amount: 120 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'amount', type: PlotFieldType.Continuous },
    ]}
    width={380}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      size="amount"
      fill="#38bdf8"
      stroke="#075985"
      strokeWidth={1.5}
      label="amount"
      labelPosition="top"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="size" position="right" />
  </Plot>
);

export default Demo;
