import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** contour 自动连接与标准方位 anchor 的两条解析路径 */
const Demo: FC = () => (
  <Layout width={640} height={220} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="auto-target"
      position={[-220, -45]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'auto-connect by id\nor numeric angle anchor'}
    </Node>
    <Node
      id="boundary-point"
      position={[0, -45]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      contour boundaryPoint
    </Node>
    <Node
      id="contour-hit"
      position={[220, -45]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      {'ray ∩ rounded contour\nexact edge hit'}
    </Node>

    <Node
      id="named-anchor"
      position={[-220, 45]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'standard direction anchor\ntop / right / …'}
    </Node>
    <Node
      id="shape-anchor"
      position={[0, 45]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'contour anchor\nno matching named point'}
    </Node>
    <Node
      id="aabb-fallback"
      position={[220, 45]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      {'circumscribing AABB\nrectangle direction point'}
    </Node>

    <Draw way={['auto-target', 'boundary-point']} arrow="->" />
    <Draw way={['boundary-point', 'contour-hit']} arrow="->" />
    <Draw way={['named-anchor', 'shape-anchor']} arrow="->" />
    <Draw way={['shape-anchor', 'aabb-fallback']} arrow="->" />
  </Layout>
);

export default Demo;
