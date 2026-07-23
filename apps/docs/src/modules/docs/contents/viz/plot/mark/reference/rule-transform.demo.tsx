import type { FC } from 'react';

import { Axis, Plot, PointMark, ReferenceMark } from '@retikz/plot-react';

import { sampleScores } from './rule-transform.data';

const Demo: FC = () => (
  <Plot data={sampleScores} width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <PointMark x="sample" y="score" color="#2563eb" minimumSize={7} />
    <ReferenceMark y={72} color="#dc2626" strokeWidth={2} />
    <Axis dimension="x" />
    <Axis dimension="y" grid />
  </Plot>
);

export default Demo;
