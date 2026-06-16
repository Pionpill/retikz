import { AreaMark, Axis, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { stats } from './area-radar.data';

/** 填充雷达：polar + closed area，闭合多边形带填充 */
const Demo: FC = () => (
  <Plot data={stats} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <AreaMark x="dim" y="value" closed />
    <Axis dimension="angle" />
    <Axis dimension="radius" grid />
  </Plot>
);

export default Demo;
