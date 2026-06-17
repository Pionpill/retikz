import type { FC } from 'react';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { samples } from './point-coordinates.data';

const Demo: FC = () => (
  <Plot data={samples} width={340} height={320} coordinate="ternary2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="partX" y="partY" z="partZ" color="group" />
    <Axis dimension="x" />
    <Axis dimension="y" />
    <Axis dimension="z" />
  </Plot>
);

export default Demo;
