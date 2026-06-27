import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={80} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 0]}>
      B
    </Node>
    <Path dashPattern={[6, 3]} stroke="green" strokeWidth={2}>
      <Step kind="move" to="a" />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
