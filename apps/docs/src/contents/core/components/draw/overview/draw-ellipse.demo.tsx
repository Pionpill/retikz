import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={200}>
    <Node id="center" position={[140, 100]} stroke="none">
      ·
    </Node>
    <Draw way={['center', { ellipse: { radiusX: 100, radiusY: 50 } }]} />
  </Layout>
);

export default Demo;
