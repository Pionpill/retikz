import { Layout } from '@retikz/react';
import { Axis, PathMark, Plot, PointMark, Transform } from '@retikz/plot-react';
import type { FC } from 'react';

import { monthlyRevenue } from './transform-sort.data';

/**
 * sort 对比：左面板按原始（乱序）行序连线，折线来回折返；
 * 右面板加 <Transform kind="sort">，先按 month 稳定排序，PathMark 再按有序行序连成单调折线。
 */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={monthlyRevenue} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="revenue" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={monthlyRevenue} width={300} height={220} x={320} y={20}>
      <Transform kind="sort" field="month" order="ascending" />
      <PathMark x="month" y="revenue" />
      <PointMark x="month" y="revenue" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
