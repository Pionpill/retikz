import { LineMark, PointMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { growth } from './scale-continuous.data';

/** scaleY="log"：对数 y 轴，每个数量级占等高，小值也看得清（仅 point / line 可用） */
const Demo: FC = () => (
  <Plot data={growth} scaleY="log" width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="year" y="users" order="year" />
    <PointMark x="year" y="users" />
  </Plot>
);

export default Demo;
