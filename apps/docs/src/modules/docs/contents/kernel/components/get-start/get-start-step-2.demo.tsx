import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const GetStartStep2: FC = () => (
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
  </Layout>
);

export default GetStartStep2;
