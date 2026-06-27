import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { scores } from './rule-threshold.data';

/** 阈值线：散点 + 一条 y=60 水平 rule（数字常量 → value，跨满 x 域，crimson 描边） */
const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot
      data={scores}
      model={[
        { name: 'name', type: 'categorical' },
        { name: 'score', type: 'continuous' },
      ]}
      width={300}
      height={220}
      x={0}
      y={30}
    >
      <PointMark x="name" y="score" />
      <ReferenceMark y={60} color="crimson" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={scores}
      model={[
        { name: 'name', type: 'categorical' },
        { name: 'score', type: 'continuous' },
      ]}
      width={260}
      height={260}
      coordinate="polar2D"
      x={350}
      y={0}
    >
      <PointMark x="name" y="score" />
      <ReferenceMark y={60} color="crimson" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
