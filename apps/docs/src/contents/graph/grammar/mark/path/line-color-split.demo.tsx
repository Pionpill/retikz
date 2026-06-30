import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { channelTrend } from './line-series.data';

/** 隐式拆分：不写 series，只用分类 color 字段拆成多条路径。 */
const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={channelTrend} width={300} height={220} x={0} y={30}>
      <PathMark x="month" y="score" color="channel" order="month" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={channelTrend} width={260} height={260} coordinate="polar2D" x={350} y={0}>
      <PathMark x="quarter" y="score" color="channel" order="month" closed />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
