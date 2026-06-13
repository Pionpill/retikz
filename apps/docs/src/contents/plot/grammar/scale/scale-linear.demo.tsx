import { Axis, LineMark, Plot, PointMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { growth } from './scale-continuous.data';

/** 缺省 linear y：跨数量级时前几年的小值被压在底部、几乎贴底 */
const Demo: FC = () => (
  <Plot data={growth} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="year" y="users" order="year" />
    <PointMark x="year" y="users" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
