import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { revenue } from './line-basic.data';

/** 位置属性：左侧笛卡尔、右侧极坐标，比较同一组点的投影差异。 */
const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={300} height={220} x={0} y={30}>
      <PathMark x="month" y="revenue" order="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={260} height={260} coordinate="polar2D" x={350} y={0}>
      <PathMark x="period" y="revenue" order="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
