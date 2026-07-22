import type { FC } from 'react';

import { DataFieldType } from '@retikz/data';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

const rows = [
  { xOpacity: 1, xFill: 4, xDraw: 7, y: 11, alpha: 0.2 },
  { xOpacity: 2, xFill: 5, xDraw: 8, y: 16, alpha: 0.55 },
  { xOpacity: 3, xFill: 6, xDraw: 9, y: 21, alpha: 0.9 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'xOpacity', type: DataFieldType.Continuous },
      { name: 'xFill', type: DataFieldType.Continuous },
      { name: 'xDraw', type: DataFieldType.Continuous },
      { name: 'y', type: DataFieldType.Continuous },
      { name: 'alpha', type: DataFieldType.Continuous },
    ]}
    width={560}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark
      x="xOpacity"
      y="y"
      opacity="alpha"
      size={15}
      fill="#2563eb"
      stroke="#1e3a8a"
      strokeWidth={2}
      label="alpha"
      labelPosition="top"
    />
    <PointMark
      x="xFill"
      y="y"
      fillOpacity="alpha"
      size={15}
      fill="#16a34a"
      stroke="#14532d"
      strokeWidth={2}
      label="alpha"
      labelPosition="top"
    />
    <PointMark
      x="xDraw"
      y="y"
      strokeOpacity="alpha"
      size={15}
      fill="#f97316"
      stroke="#7c2d12"
      strokeWidth={5}
      label="alpha"
      labelPosition="top"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
