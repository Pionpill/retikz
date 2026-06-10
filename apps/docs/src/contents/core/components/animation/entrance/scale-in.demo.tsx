import { Layout, Node, scaleIn } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={200} height={100}>
    <Node id="a" position={[0, 0]} fill="#8b5cf6" animations={[scaleIn()]}>
      pop
    </Node>
  </Layout>
);

export default Demo;
