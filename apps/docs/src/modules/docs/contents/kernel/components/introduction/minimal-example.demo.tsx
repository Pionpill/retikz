import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const MinimalExample: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]} style={{ stroke: 'none' }}>
      A
    </Node>
    <Node id="b" position={[100, 0]} style={{ stroke: 'none' }}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" />
  </Layout>
);

export default MinimalExample;
