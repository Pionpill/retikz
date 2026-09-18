import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const NodeConnectionBasic: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node
      id="b"
      position={{ kind: 'anchor', target: { id: 'a', anchor: 'right', offset: [40, 0] }, selfAnchor: 'left' }}
    >
      B
    </Node>
    <Draw way={['a', 'b']} />
  </Layout>
);

export default NodeConnectionBasic;
