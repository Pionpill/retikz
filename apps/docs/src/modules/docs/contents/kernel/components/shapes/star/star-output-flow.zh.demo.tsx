import type { FC } from 'react';

import { Draw, Layout, Node } from '@retikz/react';

/** Star Sugar 与 Node shape 的几何消费路径 */
const Demo: FC = () => (
  <Layout width={430} height={260} style={{ maxWidth: '100%', height: 'auto' }}>
    <Node
      id="sugar"
      position={[-135, -68]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      {'<Star> · −90°'}
    </Node>
    <Node
      id="node"
      position={[-135, 68]}
      stroke="darkorange"
      fill="darkorange"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      {'Node star · 0°'}
    </Node>
    <Node
      id="vertices"
      position={[-15, 0]}
      stroke="dimgray"
      fill="lightgray"
      fillOpacity={0.16}
      cornerRadius={4}
      font={{ size: 14, weight: 'bold' }}
    >
      2p 交替顶点
    </Node>
    <Node
      id="path"
      position={[140, -68]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      闭合 Path
    </Node>
    <Node
      id="boundary"
      position={[140, 68]}
      stroke="dodgerblue"
      fill="dodgerblue"
      fillOpacity={0.08}
      cornerRadius={4}
      font={{ size: 13 }}
    >
      边界 · anchors
    </Node>

    <Draw
      way={[
        'sugar',
        { label: { text: '计算', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'vertices',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'node',
        { label: { text: '计算', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'vertices',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'vertices',
        { label: { text: '闭合', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'path',
      ]}
      arrow="->"
    />
    <Draw
      way={[
        'vertices',
        { label: { text: '投影', side: 'top', sloped: true, textColor: 'gray', font: { size: 12 } } },
        'boundary',
      ]}
      arrow="->"
    />
  </Layout>
);

export default Demo;
