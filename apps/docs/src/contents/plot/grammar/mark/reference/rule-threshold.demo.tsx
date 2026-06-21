import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { scores } from './rule-threshold.data';

/** 阈值线：散点 + 一条 y=60 水平 rule（数字常量 → value，跨满 x 域，crimson 描边） */
const Demo: FC = () => (
  <Plot
    data={scores}
    model={[
      { name: 'name', type: 'categorical' },
      { name: 'score', type: 'continuous' },
    ]}
    width={320}
    height={240}
    style={{ maxWidth: '100%', height: 'auto' }}
  >
    <PointMark x="name" y="score" />
    <ReferenceMark y={60} color="crimson" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
