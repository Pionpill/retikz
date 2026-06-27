import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={160} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* 三次贝塞尔：两个控制点分别影响起末切线，常用于 S 形曲线 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step
        kind="cubic"
        to="b"
        control1={[60, -60]}
        control2={[140, 60]}
      />
    </Path>
  </Layout>
);

export default Demo;
