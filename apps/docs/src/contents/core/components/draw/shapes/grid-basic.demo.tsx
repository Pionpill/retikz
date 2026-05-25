import { Grid, Layout, Rectangle } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={170}>
    {/* 底纹网格（细灰）+ 外框 */}
    <Grid corner1={[0, 0]} corner2={[240, 140]} step={20} stroke="lightgray" />
    <Rectangle corner1={[0, 0]} corner2={[240, 140]} stroke="gray" strokeWidth={2} />
  </Layout>
);

export default Demo;
