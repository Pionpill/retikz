import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { climate } from './line-series.data';

/** 显式 series：左侧笛卡尔、右侧极坐标，每个 city 下沉为一条路径。 */
const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={climate} width={300} height={220} x={0} y={30}>
      <PathMark x="month" y="score" series="city" order="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={climate} width={260} height={260} coordinate="polar2D" x={350} y={0}>
      <PathMark x="quarter" y="score" series="city" order="month" closed />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
