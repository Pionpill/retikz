import { Axis, LineMark, Plot, PointMark, Scale } from '@retikz/plot-react';
import type { FC } from 'react';

import { growth } from './scale-continuous.data';

/** <Scale dimension="y" type="sqrt" />：平方根 y 轴，弱化大值的视觉夸张（仅 point / line 可用） */
const Demo: FC = () => (
  <Plot data={growth} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="year" y="users" order="year" />
    <PointMark x="year" y="users" />
    <Scale dimension="y" type="sqrt" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
