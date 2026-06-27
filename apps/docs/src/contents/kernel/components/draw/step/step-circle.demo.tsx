import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={200} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[80, 100]} stroke="none">
      A
    </Node>
    <Node id="b" position={[200, 100]} stroke="none">
      B
    </Node>
    {/* 以 a 为圆心画整圆 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="circlePath" radius={30} />
    </Path>
    {/* 以 b 为圆心画整圆 */}
    <Path stroke="currentColor" dashPattern={[4, 2]}>
      <Step kind="move" to="b" />
      <Step kind="circlePath" radius={20} />
    </Path>
  </Layout>
);

export default Demo;
