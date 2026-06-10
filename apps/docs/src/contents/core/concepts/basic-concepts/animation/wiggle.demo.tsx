import { Layout, Node, wiggle } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={160} height={100}>
    <Node id="a" position={[0, 0]} fill="#8b5cf6" animations={[wiggle()]}>
      wiggle
    </Node>
  </Layout>
);

export default Demo;
