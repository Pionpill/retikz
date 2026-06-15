import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, LineMark, Plot, Scale } from '@retikz/plot-react';

import { growth } from './plot-scale.data';

const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={growth} width={300} height={220} transforms={[{ kind: 'translate', x: 0, y: 20 }]}>
      <LineMark x="month" y="users" order="monthIndex" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={growth} width={300} height={220} transforms={[{ kind: 'translate', x: 320, y: 20 }]}>
      <LineMark x="month" y="users" order="monthIndex" />
      <Scale dimension="y" type="log" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
