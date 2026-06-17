import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { points } from './point-api.data';

const Demo: FC = () => (
  <Layout width={620} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={points} width={300} height={220} x={0} y={20}>
      <PointMark x="x" y="y" color="region" size="pop" opacity="pop" shape="region" strokeField="region" strokeWidthField="pop" fillOpacity={0.75} rotate={45} />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot data={points} width={260} height={260} coordinate="polar2D" x={340} y={0}>
      <PointMark x="x" y="y" color="region" size="pop" opacity="pop" shape="region" strokeField="region" strokeWidthField="pop" fillOpacity={0.75} rotate={45} />
      <Axis dimension="angle" />
      <Axis dimension="radius" grid />
    </Plot>
  </Layout>
);

export default Demo;
