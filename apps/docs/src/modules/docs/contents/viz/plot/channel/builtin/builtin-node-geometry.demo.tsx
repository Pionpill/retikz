import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { x: 1, y: 11, text: 'plain', ink: 'red', radius: 0, angle: 0, pad: 2 },
  { x: 2, y: 16, text: 'round', ink: 'green', radius: 8, angle: 0, pad: 6 },
  { x: 3, y: 13, text: 'rotated', ink: 'blue', radius: 8, angle: 18, pad: 8 },
  { x: 4, y: 20, text: 'wide', ink: 'purple', radius: 14, angle: -15, pad: 10 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'x', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'text', type: DataFieldType.Categorical },
      { name: 'ink', type: DataFieldType.Categorical },
      { name: 'radius', type: DataFieldType.Continuous },
      { name: 'angle', type: DataFieldType.Continuous },
      { name: 'pad', type: DataFieldType.Continuous },
    ]}
    width={440}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="x"
      y="y"
      text="text"
      fill="#fef3c7"
      stroke="#92400e"
      textColor="ink"
      padding="pad"
      cornerRadius="radius"
      rotate="angle"
      minimumSize={{ width: 54, height: 28 }}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
