import type { FC } from 'react';

import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { team } from './line-radar.data';

/** 几何属性：两个极坐标对比闭合路径与不闭合路径。 */
const Demo: FC = () => (
  <Layout width={620} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={team} width={280} height={280} coordinate="polar2D" x={10} y={10}>
      <PathMark x="dim" y="score" order="rank" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={team} width={280} height={280} coordinate="polar2D" x={330} y={10}>
      <PathMark x="dim" y="score" order="rank" closed={false} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
