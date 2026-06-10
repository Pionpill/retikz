import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={160}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[140, 60]}>
      B
    </Node>
    <Node id="c" position={[140, -60]}>
      C
    </Node>
    {/* via='-|'：先水平再垂直，落到 B */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="fold" via="-|" to="b" />
    </Path>
    {/* via='|-'：先垂直再水平，落到 C */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="fold" via="|-" to="c" />
    </Path>
  </Layout>
);

export default Demo;
