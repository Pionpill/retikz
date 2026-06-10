import { Layout, Node, blink } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={160} height={100}>
    <Node id="a" position={[0, 0]} fill="#ef4444" animations={[blink()]}>
      blink
    </Node>
  </Layout>
);

export default Demo;
