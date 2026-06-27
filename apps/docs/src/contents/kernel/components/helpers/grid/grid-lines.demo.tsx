import { Grid, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={190}>
    <Grid
      corner1={[35, 30]}
      corner2={[265, 80]}
      step={18}
      showVertical={false}
      stroke="lightgray"
      majorEvery={2}
      majorStroke="gray"
    />
    <Grid
      corner1={[35, 115]}
      corner2={[265, 160]}
      step={18}
      showHorizontal={false}
      stroke="lightgray"
      majorEvery={2}
      majorStroke="gray"
    />
  </Layout>
);

export default Demo;
