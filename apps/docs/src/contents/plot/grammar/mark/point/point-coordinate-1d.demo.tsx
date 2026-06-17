import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { samples } from './point-coordinates.data';

const Demo: FC = () => (
  <Layout width={620} height={230} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={samples} width={300} height={150} coordinate="cartesian1D" x={0} y={40}>
      <PointMark x="value" color="group" />
      <Axis dimension="x" />
    </Plot>
    <Plot data={samples} width={230} height={230} coordinate="polar1D" x={360} y={0}>
      <PointMark x="value" color="group" />
      <Axis dimension="angle" />
    </Plot>
  </Layout>
);

export default Demo;
