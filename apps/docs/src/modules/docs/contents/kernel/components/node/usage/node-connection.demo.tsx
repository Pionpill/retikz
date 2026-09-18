import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const NodeConnection: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} arrow="->" />
  </Layout>
);

export default NodeConnection;
