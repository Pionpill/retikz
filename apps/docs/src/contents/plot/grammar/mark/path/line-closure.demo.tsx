import { Axis, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { closureRadar, closureTrend } from './line-closure.data';

const Demo: FC = () => (
  <Layout width={620} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={closureTrend} width={300} height={230} x={0} y={35}>
      <PathMark
        x="month"
        y="value"
        order="order"
        curve="monotoneX"
        closure={{ kind: 'baseline', baseline: 30 }}
        fill="rgba(14, 165, 233, 0.22)"
        stroke="#0284c7"
        strokeWidth={2.5}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={closureRadar} width={260} height={260} coordinate="polar2D" x={350} y={10}>
      <PathMark
        x="dim"
        y="score"
        order="order"
        closure={{ kind: 'cycle' }}
        fill="rgba(16, 185, 129, 0.22)"
        stroke="#059669"
        strokeWidth={2.5}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
