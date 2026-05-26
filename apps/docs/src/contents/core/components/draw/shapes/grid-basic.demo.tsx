import { Grid, Layout } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    {/* 底纹网格（细灰） */}
    <Grid corner1={[0, 0]} corner2={[240, 140]} step={20} stroke="lightgray" />
  </Layout>
);

export default Demo;
