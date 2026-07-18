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
      {'按 id 自动连接\n或数字角度 anchor'}
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
      {'射线 ∩ 圆角轮廓\n精确贴边'}
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
      {'标准方位 anchor\ntop / right / …'}
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
      {'contour anchor\n无对应命名点'}
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
      {'外接 AABB\n矩形方位点'}
    </Node>

    <Draw way={['auto-target', 'boundary-point']} arrow="->" />
    <Draw way={['boundary-point', 'contour-hit']} arrow="->" />
    <Draw way={['named-anchor', 'shape-anchor']} arrow="->" />
    <Draw way={['shape-anchor', 'aabb-fallback']} arrow="->" />
  </Layout>
);

export default Demo;
