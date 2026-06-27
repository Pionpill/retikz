import { Axis, IntervalMark, Plot, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { tasks } from './transform-derive-interval.data';

/** derive-interval 甘特条：每行独立把 start/end 派生为 y0/y1，IntervalMark 用 extent bounds 读取区间。 */
const Demo: FC = () => (
  <Plot data={tasks} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="derive-interval" startFrom="start" endFrom="end" />
    <IntervalMark x="task" color="phase" bounds={{ y: { kind: 'extent', from: 'y0', to: 'y1' } }} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
