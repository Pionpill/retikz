import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { measurements } from './transform-histogram.data';

/** 直方图：<Transform kind="bin"> 把连续 measurement 分箱，<IntervalMark x0/x1> 读箱边画连续 x 区间柱、binValue 作高度 */
const Demo: FC = () => (
  <Plot data={measurements} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="bin" field="measurement" count={8} />
    <IntervalMark x0="binStart" x1="binEnd" y="binValue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
