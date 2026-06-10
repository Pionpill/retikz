import { Layout, Node, grow } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={200} height={100}>
    <Node id="a" position={[0, 0]} fill="#f59e0b" animations={[grow()]}>
      grow
    </Node>
  </Layout>
);

export default Demo;
