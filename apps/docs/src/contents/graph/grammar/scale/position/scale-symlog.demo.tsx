import { Layout } from '@retikz/react';
import { Axis, PathMark, Plot, PointMark, Scale } from '@retikz/plot-react';
import type { FC } from 'react';

import { netFlow } from './scale-symlog.data';

/**
 * symlog 对比：同一份跨零的逐月净现金流。
 * 左面板缺省 linear，近零的几个月全贴在 0 线；右面板加 <Scale type="symlog">，近零线性、两侧对数，铺开可读（仅 point / line）。
 */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={netFlow} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="net" order="month" />
      <PointMark x="month" y="net" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={netFlow} width={300} height={220} x={320} y={20}>
      <PathMark x="month" y="net" order="month" />
      <PointMark x="month" y="net" />
      <Scale dimension="y" type="symlog" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
