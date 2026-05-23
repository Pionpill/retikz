import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={320} height={160}>
    <Node id="a" position={[0, 0]}>
      A
    </Node>
    <Node id="b" position={[200, 0]}>
      B
    </Node>
    {/* 二次贝塞尔：一个控制点决定弯曲形态 */}
    <Path stroke="currentColor">
      <Step kind="move" to="a" />
      <Step kind="curve" to="b" control={[100, -60]} />
    </Path>
  </Layout>
);

export default Demo;
