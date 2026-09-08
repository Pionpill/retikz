import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

const GetStartFinal: FC = () => (
  <Layout>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Node id="c" position={[200, 0]}>
      C
    </Node>
    <Draw way={['a', 'b']} arrow="->" />
    <Draw way={['b', 'c']} arrow="->" />
  </Layout>
);

export default GetStartFinal;
