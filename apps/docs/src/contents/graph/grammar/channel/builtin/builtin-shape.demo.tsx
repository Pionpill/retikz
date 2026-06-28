import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
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
      { name: 'x', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'kind', type: PlotFieldType.Categorical },
    ]}
    width={420}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="x" y="y" shape="kind" color="kind" size={11} label="kind" labelPosition="above" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
    <Legend channel="shape" position="right" />
  </Plot>
);

export default Demo;
