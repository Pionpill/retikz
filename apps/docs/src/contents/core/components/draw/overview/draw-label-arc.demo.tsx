import { Draw, Layout, Node } from '@retikz/react';
import type { FC } from 'react';

const Demo: FC = () => (
  <Layout width={280} height={220}>
    <Node id="center" position={[140, 30]} stroke="none">·</Node>
    {/* Arc：t 线性映射 startAngle..endAngle；0..120° 弧上演示三档 */}
    <Draw
      way={[
        'center',
        { label: { text: 't=0.25 (30°)', position: 0.25 } },
        { arc: { startAngle: 0, endAngle: 120, radius: 120 } },
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'center',
        { label: { text: 'midway (60°)', position: 'midway', side: 'sloped' } },
        { arc: { startAngle: 0, endAngle: 120, radius: 120 } },
      ]}
      dashPattern={[3, 3]}
    />
  </Layout>
);

export default Demo;
