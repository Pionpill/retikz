import { PlotFieldType } from '@retikz/plot';
import { Axis, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

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
      { name: 'x', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'text', type: PlotFieldType.Categorical },
      { name: 'ink', type: PlotFieldType.Categorical },
      { name: 'radius', type: PlotFieldType.Continuous },
      { name: 'angle', type: PlotFieldType.Continuous },
      { name: 'pad', type: PlotFieldType.Continuous },
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
      minimumWidth={54}
      minimumHeight={28}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
