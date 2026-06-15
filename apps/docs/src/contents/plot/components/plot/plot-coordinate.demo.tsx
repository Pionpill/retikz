import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, BarMark, Plot } from '@retikz/plot-react';

import { revenue } from './plot-cartesian.data';

const Demo: FC = () => (
  <Layout width={580} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={revenue} width={300} height={220} transforms={[{ kind: 'translate', x: 0, y: 20 }]}>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={revenue} width={260} height={260} coordinate="polar2D" transforms={[{ kind: 'translate', x: 320, y: 0 }]}>
      <BarMark x="quarter" y="value" color="quarter" />
      <Axis dimension="angle" />
      <Axis dimension="radius" grid />
    </Plot>
  </Layout>
);

export default Demo;
