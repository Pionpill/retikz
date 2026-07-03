import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={280} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    <Draw way={['center', { ellipse: { radius: { x: 100, y: 50  }} }]} />
  </Layout>
);

export default Demo;
