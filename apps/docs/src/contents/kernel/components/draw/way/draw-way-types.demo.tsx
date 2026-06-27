import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={400} height={160} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Draw way={['a', [120, 0]]} />
    <Draw way={['a', { origin: 'a', angle: 60, radius: 80 }]} />
    <Draw way={[[0, 60], [120, 60]]} />
  </Layout>
);

export default Demo;
