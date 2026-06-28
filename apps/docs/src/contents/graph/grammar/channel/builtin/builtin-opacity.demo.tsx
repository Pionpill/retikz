import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
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
      { name: 'xOpacity', type: PlotFieldType.Continuous },
      { name: 'xFill', type: PlotFieldType.Continuous },
      { name: 'xDraw', type: PlotFieldType.Continuous },
      { name: 'y', type: PlotFieldType.Continuous },
      { name: 'alpha', type: PlotFieldType.Continuous },
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
      labelPosition="above"
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
      labelPosition="above"
    />
    <PointMark
      x="xDraw"
      y="y"
      drawOpacity="alpha"
      size={15}
      fill="#f97316"
      stroke="#7c2d12"
      strokeWidth={5}
      label="alpha"
      labelPosition="above"
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
