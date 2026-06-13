import { Layout, Node, fadeIn } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={200} height={100}>
    <Node id="a" position={[0, 0]} fill="#3b82f6" animations={[fadeIn()]}>
      hi
    </Node>
  </Layout>
);

export default Demo;
