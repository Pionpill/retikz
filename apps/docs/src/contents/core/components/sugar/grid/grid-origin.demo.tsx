import { Grid, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={190}>
    <Grid
      corner1={[34, 26]}
      corner2={[266, 164]}
      step={24}
      origin={[150, 95]}
      includeBoundary
      stroke="lightgray"
      majorEvery={2}
      majorStroke="gray"
      majorDashPattern={[4, 3]}
      border
      borderStroke="dimgray"
      borderRenderOrder="before"
    />
  </Layout>
);

export default Demo;
