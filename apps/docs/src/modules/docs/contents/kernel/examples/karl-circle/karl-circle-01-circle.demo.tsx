import type { FC } from 'react';

import { Circle, Layout } from '@retikz/react';

const Demo: FC = () => (
  <Layout>
    {/* 单位圆：直接用 Circle sugar；圆心 + 半径最短也最直观 */}
    <Circle center={[0, 0]} radius={100} style={{ lineCap: 'round' }} />
  </Layout>
);

export default Demo;
