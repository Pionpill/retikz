import type { FC } from 'react';
import { Layout } from '@retikz/react';
import { Axis, Plot, PointMark } from '@retikz/plot-react';

import { funnel } from './data-model-custom.data';

/** Left: numeric stage is inferred as continuous. Right: model makes it categorical and parses percent strings. */
const Demo: FC = () => (
  <Layout width={620} height={250} style={{ maxWidth: '100%', height: 'auto' }}>
    <Plot data={funnel} width={300} height={220} x={0} y={20}>
      <PointMark x="stage" y="rate" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
    <Plot
      data={funnel}
      model={[
        { name: 'stage', type: 'categorical' },
        { name: 'rateText', format: 'percent' },
      ]}
      width={300}
      height={220}
      x={320}
      y={20}
    >
      <PointMark x="stage" y="rateText" color="stage" />
      <Axis dimension="x" />
      <Axis dimension="y" grid />
    </Plot>
  </Layout>
);

export default Demo;
