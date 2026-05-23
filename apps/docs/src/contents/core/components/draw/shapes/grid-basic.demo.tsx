import { Grid, Rectangle, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={280} height={170}>
    {/* 底纹网格（细灰）+ 外框 */}
    <Grid corner1={[0, 0]} corner2={[240, 140]} step={20} stroke="#d1d5db" />
    <Rectangle corner1={[0, 0]} corner2={[240, 140]} stroke="#374151" strokeWidth={2} />
  </TikZ>
);

export default Demo;
