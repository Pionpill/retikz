import { Axis, PathMark, Plot, PointMark, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { monthlyRevenue } from './transform-sort.data';

/** sort 折线：输入行按月份乱序，transform 先按 month 稳定排序，再交给 PathMark 按当前行序连接。 */
const Demo: FC = () => (
  <Plot data={monthlyRevenue} width={420} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Transform kind="sort" field="month" order="ascending" />
    <PathMark x="month" y="revenue" />
    <PointMark x="month" y="revenue" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
