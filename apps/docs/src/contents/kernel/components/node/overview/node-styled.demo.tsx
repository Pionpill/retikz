import { Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={400} height={80}>
    <Node id="a" position={[-90, 0]} fill="lightgray" stroke="darkorange">
      Filled
    </Node>
    <Node id="b" position={[0, 0]} stroke="dodgerblue" strokeWidth={2}>
      Stroked
    </Node>
    <Node id="c" position={[90, 0]} padding={12} font={{ size: 18 }}>
      Big
    </Node>
  </Layout>
);

export default Demo;
