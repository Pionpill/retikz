import type { FC } from 'react';

import { Layout, Node, Path, Step } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={280} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    {/* 横扁椭圆 */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step kind="ellipsePath" radius={{ x: 100, y: 50 }} />
    </Path>
  </Layout>
);

export default Demo;
