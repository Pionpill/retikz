import { Layout, Node, Path, Step } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={220} nodeDefault={{ stroke: 'gray', dashed: true }}>
    <Node id="center" position={[140, 30]} stroke="none">
      ·
    </Node>
    {/* Arc：t 线性映射 startAngle..endAngle；0..120° 弧上 t=0.25 落在 30° */}
    <Path stroke="currentColor">
      <Step kind="move" to="center" />
      <Step
        kind="arc"
        startAngle={0}
        endAngle={120}
        radius={120}
        label={{ text: 't=0.25 (30°)', position: 0.25 }}
      />
    </Path>
  </Layout>
);

export default Demo;
