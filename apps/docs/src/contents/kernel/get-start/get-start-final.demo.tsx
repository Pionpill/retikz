import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const GetStartFinal: FC = () => (
  <Layout width={420} height={80}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[100, 0]}>
      B
    </Node>
    <Node id="c" position={[200, 0]}>
      C
    </Node>
    <Draw way={['a', 'b']} />
    <Draw way={['b', 'c']} />
  </Layout>
);

export default GetStartFinal;
