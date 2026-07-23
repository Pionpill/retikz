import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Legend, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 12, kind: 'circle' },
  { x: 2, y: 18, kind: 'square' },
  { x: 3, y: 14, kind: 'diamond' },
  { x: 4, y: 22, kind: 'circle' },
  { x: 5, y: 17, kind: 'square' },
  { x: 6, y: 24, kind: 'diamond' },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'kind', type: DataFieldType.Categorical },
    ]}
    width={420}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" shape="kind" color="kind" size={11} label="kind" labelPosition="top" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="shape" position="right" />
  </Plot>
);

export default Demo;
