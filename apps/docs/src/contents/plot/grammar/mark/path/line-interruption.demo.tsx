import { Axis, Legend, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { interruptedArea } from './line-interruption.data';

const Demo: FC = () => (
  <Layout width={700} height={320} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={interruptedArea} width={640} height={260} x={25} y={30} colors={['#0f8f98', '#8cf27e']}>
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        fill="name"
        closure={{ kind: 'baseline' }}
        stroke="none"
        opacity={0.48}
      />
      <PathMark
        x="year"
        y="amount"
        order="year"
        series="name"
        color="name"
        strokeWidth={2.4}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  </Layout>
);

export default Demo;
