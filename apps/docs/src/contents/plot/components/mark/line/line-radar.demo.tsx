import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { team } from './line-radar.data';

/** 雷达：polar + closed 折线，首尾相接成线框多边形 */
const Demo: FC = () => (
  <Plot data={team} width={320} height={320} coordinate="polar" style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="dim" y="score" closed />
    <Axis dimension="angle" />
    <Axis dimension="radius" grid />
  </Plot>
);

export default Demo;
