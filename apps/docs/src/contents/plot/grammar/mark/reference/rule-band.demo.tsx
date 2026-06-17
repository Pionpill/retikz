import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';
import type { FC } from 'react';

import { scores } from './rule-threshold.data';

/** 容差带：散点 + 水平 band y∈[60,80]（给 yTo → band，跨满 x 域，amber 填充经 projectCell 出矩形） */
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
    <ReferenceMark y={60} yTo={80} color="#fde68a" />
    <PointMark x="name" y="score" />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
