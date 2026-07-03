import type { FC } from 'react';

import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { growth } from './scale-continuous.data';

/**
 * linear vs log 对比：同一份逐年用户量（跨多个数量级）。
 * 左面板缺省 linear，前几年全贴在底部；右面板加 <Scale dimension="y" type="log">，每个数量级占等高，小值也看得清。
 */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={growth} width={300} height={220} x={0} y={20}>
      <PathMark x="year" y="users" order="year" />
      <PointMark x="year" y="users" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={growth} width={300} height={220} x={320} y={20}>
      <PathMark x="year" y="users" order="year" />
      <PointMark x="year" y="users" />
      <Scale dimension="y" type="log" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
