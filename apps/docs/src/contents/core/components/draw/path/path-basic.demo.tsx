import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={300} height={120}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[120, 60]}>
      B
    </Node>
    <Path stroke="#3b82f6" strokeWidth={2}>
      <Step kind="move" to="a" />
      <Step kind="line" to={[60, 0]} />
      <Step kind="line" to="b" />
    </Path>
  </Layout>
);

export default Demo;
