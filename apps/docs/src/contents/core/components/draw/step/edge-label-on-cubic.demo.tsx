import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={420} height={200}>
    <Node id="a" position={[40, 160]}>
      A
    </Node>
    <Node id="b" position={[380, 160]}>
      B
    </Node>
    {/* Cubic Bezier：t 是 Bezier 参数；对称 S-curve 上演示三档 */}
    <Path stroke="currentColor" arrow="->">
      <Step kind="move" to="a" />
      <Step
        kind="cubic"
        control1={[150, 20]}
        control2={[270, 20]}
        to="b"
        label={{ text: 't=0.25', position: 0.25 }}
      />
    </Path>
    <Path stroke="currentColor" dashPattern={[3, 3]}>
      <Step kind="move" to="a" />
      <Step
        kind="cubic"
        control1={[150, 20]}
        control2={[270, 20]}
        to="b"
        label={{ text: 'midway', position: 'midway', side: 'below' }}
      />
    </Path>
  </Layout>
);

export default Demo;
