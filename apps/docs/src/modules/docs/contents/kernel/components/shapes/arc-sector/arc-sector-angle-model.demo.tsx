import type { FC } from 'react';

import { Arc, Circle, Draw, Layout, Node } from '@retikz/react';

/** Arc / Sector 共用的屏幕坐标角度模型 */
const Demo: FC = () => (
  <Layout width={460} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Draw
      way={[
        [-125, 0],
        [135, 0],
      ]}
      arrow="->"
      stroke="lightgray"
    />
    <Draw
      way={[
        [0, -105],
        [0, 110],
      ]}
      arrow="->"
      stroke="lightgray"
    />
    <Circle center={[0, 0]} radius={70} stroke="lightgray" fill="transparent" dashPattern={[3, 3]} />
    <Draw
      way={[
        [0, 0],
        [57.34, -40.15],
      ]}
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Draw
      way={[
        [0, 0],
        [-23.94, 65.78],
      ]}
      stroke="gray"
      dashPattern={[4, 3]}
    />
    <Arc center={[0, 0]} radius={70} startAngle={-35} endAngle={110} stroke="darkorange" strokeWidth={3} arrow="->" />
    <Circle center={[0, 0]} radius={3} stroke="none" fill="currentColor" />

    <Node position={[152, -12]} stroke="none" font={{ size: 13 }}>
      0° / +x
    </Node>
    <Node position={[38, 112]} stroke="none" font={{ size: 13 }}>
      90° / +y
    </Node>
    <Node position={[92, -55]} stroke="none" font={{ size: 13 }}>
      startAngle
    </Node>
    <Node position={[-70, 88]} stroke="none" font={{ size: 13 }}>
      endAngle
    </Node>
    <Node position={[125, 58]} stroke="none" textColor="darkorange" font={{ size: 13, weight: 'bold' }}>
      sweepAngle
    </Node>
    <Node position={[-28, -16]} stroke="none" textColor="gray" font={{ size: 12 }}>
      center
    </Node>
  </Layout>
);

export default Demo;
