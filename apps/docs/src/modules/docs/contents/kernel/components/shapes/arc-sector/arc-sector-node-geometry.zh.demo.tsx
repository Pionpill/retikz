import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Arc / Sector Node 形状从参数到几何能力的局部流程图 */
const Demo: FC = () => (
  <Layout width={580} height={300} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="params"
      position={[-225, -25]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Node shape + params
    </Node>
    <Node
      id="geometry"
      position={[-35, -25]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 13, weight: 'bold' }}
    >
      形状几何 / 轮廓
    </Node>
    <Node
      id="aabb"
      position={[165, -78]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      精确 AABB
    </Node>
    <Node
      id="anchors"
      position={[165, -26]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      命名 anchor
    </Node>
    <Node
      id="boundary"
      position={[165, 26]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      连接边界
    </Node>
    <Node
      id="scene"
      position={[165, 78]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      Scene path
    </Node>
    <Node
      id="toward"
      position={[-35, 78]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 12 }}
    >
      连接目标
    </Node>

    <Draw
      way={[
        'params',
        { label: { text: '派生', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'geometry',
      ]}
      arrow="->"
    />
    <Draw way={['geometry', 'aabb']} arrow="->" />
    <Draw way={['geometry', 'anchors']} arrow="->" />
    <Draw way={['geometry', 'boundary']} arrow="->" />
    <Draw way={['geometry', 'scene']} arrow="->" />
    <Draw
      way={[
        'toward',
        { label: { text: 'toward', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary',
      ]}
      arrow="->"
      stroke="gray"
      dashPattern={[4, 3]}
    />
  </Layout>
);

export default Demo;
