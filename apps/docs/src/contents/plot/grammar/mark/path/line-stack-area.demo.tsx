import { Axis, Legend, PathMark, Plot } from '@retikz/plot-react';
import { Layout } from '@retikz/react';
import type { FC } from 'react';

import { stackArea } from './line-stack-area.data';

const Demo: FC = () => (
  <Layout width={620} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={stackArea} width={560} height={230} x={30} y={20} colors={['#2563eb', '#f97316']}>
      <PathMark
        x="month"
        y="y1"
        order="order"
        series="segment"
        color="segment"
        curve="monotoneX"
        closure={{ kind: 'stack', baselineField: 'y0' }}
        strokeWidth={2}
      />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
      <Legend channel="color" />
    </Plot>
  </Layout>
);

export default Demo;
