import { Node, Path, Step, TikZ } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <TikZ width={280} height={220}>
    <Node id="center" position={[140, 30]} stroke="none">
      ·
    </Node>
    {/* Arc：t 线性映射 startAngle..endAngle；0..120° 弧上演示三档 */}
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
    <Path stroke="currentColor" strokeDasharray="3 3">
      <Step kind="move" to="center" />
      <Step
        kind="arc"
        startAngle={0}
        endAngle={120}
        radius={120}
        label={{ text: 'midway (60°)', position: 'midway', side: 'sloped' }}
      />
    </Path>
  </TikZ>
);

export default Demo;
