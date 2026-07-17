import type { FC } from 'react';

import { Circle, Draw, Ellipse, Layout, Node, Rectangle } from '@retikz/react';

/** 同一内容框在 proportional / equal 外接策略下的边界对照图 */
const Demo: FC = () => (
  <Layout width={660} height={280} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node position={[-170, -100]} stroke="none" fill="none" font={{ size: 14, weight: 'bold' }}>
      ellipse · proportional
    </Node>
    <Node position={[170, -100]} stroke="none" fill="none" font={{ size: 14, weight: 'bold' }}>
      circle preset · equal
    </Node>

    <Ellipse
      center={[-170, -10]}
      radius={{ x: 73.54, y: 33.94 }}
      stroke="dodgerblue"
      strokeWidth={1.5}
      fill="dodgerblue"
      fillOpacity={0.06}
    />
    <Rectangle center={[-170, -10]} width={104} height={48} stroke="lightgray" dashPattern={[5, 4]} fill="none" />
    <Node position={[-170, -10]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      content + padding
    </Node>
    <Draw
      way={[
        [-170, -10],
        [-96.46, -10],
      ]}
      stroke="lightgray"
    />
    <Circle center={[-96.46, -10]} radius={3} stroke="none" fill="dodgerblue" />
    <Node position={[-102, 43]} stroke="none" fill="none" textColor="gray" font={{ size: 11 }}>
      connection boundary
    </Node>
    <Node position={[-170, 82]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      each half-axis × √2
    </Node>

    <Circle
      center={[170, -10]}
      radius={57.27}
      stroke="darkorange"
      strokeWidth={1.5}
      fill="darkorange"
      fillOpacity={0.06}
    />
    <Rectangle center={[170, -10]} width={104} height={48} stroke="lightgray" dashPattern={[5, 4]} fill="none" />
    <Node position={[170, -10]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      content + padding
    </Node>
    <Draw
      way={[
        [170, -10],
        [227.27, -10],
      ]}
      stroke="lightgray"
    />
    <Circle center={[227.27, -10]} radius={3} stroke="none" fill="darkorange" />
    <Node position={[224, 61]} stroke="none" fill="none" textColor="gray" font={{ size: 11 }}>
      connection boundary
    </Node>
    <Node position={[170, 82]} stroke="none" fill="none" textColor="gray" font={{ size: 12 }}>
      radius = content-box half-diagonal
    </Node>

    <Node position={[0, 120]} stroke="none" fill="none" textColor="gray" font={{ size: 11 }}>
      one ellipse provider · two circumscribe policies
    </Node>
  </Layout>
);

export default Demo;
