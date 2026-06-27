import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={200} height={80}>
    <Node id="a" position={[0, 0]}>
      Hello
    </Node>
  </Layout>
);

export default Demo;
