import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const Demo: FC = () => (
  <Layout width={300} height={120}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Node id="c" position={[60, 60]}>
      C
    </Node>
    <Draw way={['a', 'b', 'c', 'a']} />
  </Layout>
);

export default Demo;
