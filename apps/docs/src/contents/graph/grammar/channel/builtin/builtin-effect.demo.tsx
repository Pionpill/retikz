import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1.0, y: 7.2, group: 'red', diameter: 62 },
  { x: 1.55, y: 7.35, group: 'green', diameter: 62 },
  { x: 2.5, y: 5.9, group: 'blue', diameter: 48 },
  { x: 3.6, y: 8.1, group: 'red', diameter: 52 },
  { x: 4.6, y: 6.2, group: 'green', diameter: 66 },
  { x: 5.05, y: 6.48, group: 'blue', diameter: 66 },
  { x: 6.3, y: 4.8, group: 'red', diameter: 46 },
  { x: 7.1, y: 7.7, group: 'green', diameter: 54 },
  { x: 8.15, y: 5.8, group: 'blue', diameter: 64 },
  { x: 8.65, y: 6.05, group: 'red', diameter: 64 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'group', type: PlotFieldType.Categorical },
      { name: 'diameter', type: PlotFieldType.Continuous },
    ]}
    width={420}
    height={260}
    colors={['#e11d48', '#22c55e', '#3b82f6']}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      color="group"
      minimumSize="diameter"
      fillOpacity={0.78}
      stroke="transparent"
      shadow="xl"
      blendMode="multiply"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
