import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { revenue } from './plot-cartesian.data';

/** 缺省 cartesian：不写 coordinate 即平面直角坐标系 */
const Demo: FC = () => (
  <Plot data={revenue} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="quarter" y="value" color="quarter" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
