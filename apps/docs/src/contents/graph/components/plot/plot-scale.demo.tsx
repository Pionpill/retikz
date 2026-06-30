import type { FC } from 'react';

import { Axis, PathMark, Plot, Scale } from '@retikz/plot-react';
import { Layout } from '@retikz/react';

import { growth } from './plot-scale.data';

const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={growth} width={300} height={220} x={0} y={20}>
      <PathMark x="month" y="users" order="monthIndex" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={growth} width={300} height={220} x={320} y={20}>
      <PathMark x="month" y="users" order="monthIndex" />
      <Scale dimension="y" type="log" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
