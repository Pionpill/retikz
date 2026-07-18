import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** contour 顶点环从任意局部原点归一到 Node position 的流程图 */
const Demo: FC = () => (
  <Layout width={620} height={210} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="points"
      position={[-210, 0]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'params.points\n任意局部原点'}
    </Node>
    <Node
      id="normalize"
      position={[0, 0]}
      stroke="gray"
      fill="gray"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      {'计算 AABB 中心 c\n逐点改写为 pᵢ − c'}
    </Node>
    <Node
      id="world-contour"
      position={[210, 0]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      {'围绕 Node position\n生成世界系轮廓'}
    </Node>

    <Draw way={['points', 'normalize']} arrow="->" />
    <Draw way={['normalize', 'world-contour']} arrow="->" />
  </Layout>
);

export default Demo;
