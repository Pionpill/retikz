import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, BarMark, LineMark, Plot } from '@retikz/plot-react';

import { revenue } from './plot-cartesian.data';

const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={300} height={220} transforms={[{ kind: 'translate', x: 0, y: 20 }]}>
      <LineMark x="quarter" y="value" order="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={300} height={220} transforms={[{ kind: 'translate', x: 320, y: 20 }]}>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
