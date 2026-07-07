import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 11, city: 'Tokyo' },
  { x: 2, y: 17, city: 'Paris' },
  { x: 3, y: 14, city: 'London' },
  { x: 4, y: 21, city: 'New York' },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'city', type: DataFieldType.Categorical },
    ]}
    width={420}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      size={9}
      fill="#dbeafe"
      stroke="#1d4ed8"
      label="city"
      labelPosition="top"
      labelPin
      labelDistance={16}
      labelTextColor="#1e3a8a"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
