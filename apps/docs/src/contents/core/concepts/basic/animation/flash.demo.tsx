import { Layout, Node, flash } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={160} height={100}>
    <Node id="a" position={[0, 0]} fill="#f59e0b" animations={[flash()]}>
      flash
    </Node>
  </Layout>
);

export default Demo;
