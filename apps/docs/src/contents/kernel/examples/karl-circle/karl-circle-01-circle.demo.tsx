import type { FC } from 'react';
import { Circle, Layout } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={600} height={360}>
    {/* 单位圆：直接用 Circle sugar；圆心 + 半径最短也最直观 */}
    <Circle center={[0, 0]} radius={100} lineCap="round" />
  </Layout>
);

export default Demo;
