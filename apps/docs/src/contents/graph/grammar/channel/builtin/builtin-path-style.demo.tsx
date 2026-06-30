import type { FC } from 'react';

import { PlotFieldType } from '@retikz/plot';
import { Axis, PathMark, Plot } from '@retikz/plot-react';

const rows = [
  { step: 1, smooth: 10, sharp: 6 },
  { step: 2, smooth: 18, sharp: 17 },
  { step: 3, smooth: 13, sharp: 9 },
  { step: 4, smooth: 24, sharp: 22 },
  { step: 5, smooth: 19, sharp: 12 },
];

const Demo: FC = () => (
  <Plot
    data={rows}
    model={[
      { name: 'step', type: PlotFieldType.Continuous },
      { name: 'smooth', type: PlotFieldType.Continuous },
      { name: 'sharp', type: PlotFieldType.Continuous },
    ]}
    width={420}
    height={250}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PathMark
      x="step"
      y="smooth"
      order="step"
      strokeWidth={5}
      lineCap="round"
      lineJoin="round"
      roundedCorners={10}
      opacity={0.8}
    />
    <PathMark
      x="step"
      y="sharp"
      order="step"
      strokeWidth={2}
      lineCap="square"
      lineJoin="bevel"
      dashPattern={[7, 4]}
      opacity={0.9}
    />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
