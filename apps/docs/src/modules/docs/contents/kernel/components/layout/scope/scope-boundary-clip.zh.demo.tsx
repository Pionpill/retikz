import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** scope.id synthetic 边界与 clip 资源流程图 */
const Demo: FC = () => (
  <Layout width={750} height={170} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="layouts"
      position={[-310, -35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      子树 layouts
    </Node>
    <Node
      id="envelope"
      position={[-125, -35]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      AABB / 最小外接圆
    </Node>
    <Node
      id="synthetic"
      position={[50, -35]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      scope.id synthetic layout
    </Node>
    <Node
      id="parent-frame"
      position={[285, -35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      父 namespace frame
    </Node>

    <Node
      id="clip-ir"
      position={[-310, 35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      clip IR
    </Node>
    <Node
      id="clip-registry"
      position={[-125, 35]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.1}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      provider 解析 + 去重
    </Node>
    <Node
      id="scene-clip"
      position={[50, 35]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      Scene resource + clipRef
    </Node>
    <Node
      id="adapter"
      position={[285, 35]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14 }}
    >
      SVG / Canvas 裁切
    </Node>

    <Draw
      way={[
        'layouts',
        { label: { text: '全局角点', side: 'top', sloped: true, distance: 10, textColor: 'gray', font: { size: 12 } } },
        'envelope',
      ]}
      arrow="->"
    />
    <Draw way={['envelope', 'synthetic']} arrow="->" />
    <Draw
      way={[
        'synthetic',
        { label: { text: 'register', side: 'top', sloped: true, distance: 10, textColor: 'gray', font: { size: 12 } } },
        'parent-frame',
      ]}
      arrow="->"
    />
    <Draw way={['clip-ir', 'clip-registry']} arrow="->" />
    <Draw way={['clip-registry', 'scene-clip']} arrow="->" />
    <Draw way={['scene-clip', 'adapter']} arrow="->" />
  </Layout>
);

export default Demo;
