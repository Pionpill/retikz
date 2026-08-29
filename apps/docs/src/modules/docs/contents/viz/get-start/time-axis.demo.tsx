import type { FC } from 'react';

import { PathMark, Plot, PlotAxis, PlotScale } from '@retikz/plot-react';

import { visits } from './time-axis.data';

/** 时间轴：<PlotScale dimension="x" type="time" /> 让 x 走时间比例尺，刻度落在时间边界、标签按时间格式化 */
const Demo: FC = () => (
  <Plot data={visits} width={360} height={200} style={{ maxWidth: '100%', height: 'auto' }}>
    <PathMark x="date" y="value" order="date" />
    <PlotScale dimension="x" type="time" />
    <PlotAxis dimension="x" />
    <PlotAxis dimension="y" grid />
  </Plot>
);

export default Demo;
