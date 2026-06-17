import { Axis, Plot, RegionMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { activity } from './area-basic.data';

/** 基础区域：上沿折线与 baseline（缺省 0）围成填充区域 */
const Demo: FC = () => (
  <Plot data={activity} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <RegionMark x="day" y="users" order="day" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
