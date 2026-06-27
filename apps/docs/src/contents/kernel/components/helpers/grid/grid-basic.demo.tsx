import { Grid, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    <Grid corner1={[20, 20]} corner2={[260, 150]} step={20} stroke="lightgray" />
  </Layout>
);

export default Demo;
