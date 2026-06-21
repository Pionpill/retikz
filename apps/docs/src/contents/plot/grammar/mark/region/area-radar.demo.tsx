import { Axis, Plot, RegionMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { stats } from './area-radar.data';

/** 填充雷达：polar + closed area，闭合多边形带填�?*/
const Demo: FC = () => (
  <Plot data={stats} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <RegionMark x="dim" y="value" closed />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
