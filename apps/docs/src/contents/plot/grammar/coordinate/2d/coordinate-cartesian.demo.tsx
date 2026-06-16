import { Axis, BarMark, Plot } from '@retikz/plot-react';
import type { FC } from 'react';

import { temperature } from './coordinate-cartesian.data';

/** 缺省 cartesian：同一份数据画成普通柱状图（x 类别在底部、y 值向上） */
const Demo: FC = () => (
  <Plot data={temperature} width={360} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <BarMark x="month" y="value" color="month" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
