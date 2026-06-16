import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { skills } from './coordinate-radar.data';

/** 雷达：polar + 闭合折线（closed），各维度沿角向均布、值映射到半径 */
const Demo: FC = () => (
  <Plot data={skills} width={320} height={320} coordinate="polar2D" style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="dim" y="value" closed />
    <Axis dimension="angle" />
    <Axis dimension="radius" grid />
  </Plot>
);

export default Demo;
