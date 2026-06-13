import { Layout, Node, slideIn } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={200} height={100}>
    <Node id="a" position={[0, 0]} fill="#ec4899" animations={[slideIn({ axis: 'x', offset: -40 })]}>
      slide
    </Node>
  </Layout>
);

export default Demo;
