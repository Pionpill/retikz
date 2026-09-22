import { Layout } from '@retikz/react';
import { Axes, Grid } from '@retikz/standard-react/presentation';
import type { FC } from 'react';

/** 居中坐标系与辅助网格 */
const PresentationComposition: FC = () => (
  <Layout>
    <Grid
      bounds={{ start: [-120, -80], end: [120, 80] }}
      line={{ spacing: 20, style: { stroke: 'gray', strokeOpacity: 0.6, strokeWidth: 0.75 } }}
    />
    <Axes
      origin={{ position: [0, 0], label: { text: '0' } }}
      x={{ extent: { negative: 135, positive: 135 }, line: { style: { strokeWidth: 1.5 } } }}
      y={{ extent: { negative: 95, positive: 95 }, line: { style: { strokeWidth: 1.5 } } }}
    />
  </Layout>
);

export default PresentationComposition;
