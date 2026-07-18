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
      {'params.points\nany local origin'}
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
      {'compute AABB center c\nrewrite each point as pᵢ − c'}
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
      {'world-space contour\naround Node position'}
    </Node>

    <Draw way={['points', 'normalize']} arrow="->" />
    <Draw way={['normalize', 'world-contour']} arrow="->" />
  </Layout>
);

export default Demo;
