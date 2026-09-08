import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout
    rootScope={{
      defaults: {
        node: {
          style: { stroke: 'gray', dashed: true },
        },
      },
    }}
  >
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Draw way={['a', 'b']} />
  </Layout>
);

export default Demo;
