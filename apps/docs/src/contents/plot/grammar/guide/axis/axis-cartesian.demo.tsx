import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './axis-cartesian.data';

/** cartesian 轴：显式列 x / y，y 加网格与刻度数 */
const Demo: FC = () => (
  <Plot data={revenue} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="month" y="revenue" order="month" />
    <Axis dimension="x" />
    <Axis dimension="y" grid tickCount={5} />
  </Plot>
);

export default Demo;
