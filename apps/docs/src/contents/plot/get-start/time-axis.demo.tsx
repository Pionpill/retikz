import { Axis, LineMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { visits } from './time-axis.data';

/** 时间轴：scaleX="time" 让 x 走时间比例尺，刻度落在时间边界、标签按时间格式化 */
const Demo: FC = () => (
  <Plot data={visits} width={360} height={200} scaleX="time" style={{ maxWidth: '100%', height: 'auto' }}>
    <LineMark x="date" y="value" order="date" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
