import type { FC } from 'react';
import { Layout, Scope } from '@retikz/react';
import { Axis, BarMark, Plot } from '@retikz/plot-react';

import { revenue } from './plot-cartesian.data';

const Demo: FC = () => (
  <Layout width={580} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Scope transforms={[{ kind: 'translate', x: 0, y: 20 }]}>
      <Plot data={revenue} width={300} height={220}>
        <BarMark x="quarter" y="value" color="quarter" />
        <Axis dimension="x" />
        <Axis dimension="y" grid />
      </Plot>
    </Scope>
    <Scope transforms={[{ kind: 'translate', x: 320, y: 0 }]}>
      <Plot data={revenue} width={260} height={260} coordinate="polar2D">
        <BarMark x="quarter" y="value" color="quarter" />
        <Axis dimension="angle" />
        <Axis dimension="radius" grid />
      </Plot>
    </Scope>
  </Layout>
);

export default Demo;
